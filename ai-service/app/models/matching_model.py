"""
Profile-Job Matcher — Neural network that scores how well an employee matches
a job post, using skill overlap, attendance reliability, performance, and tenure.
"""

import torch
import torch.nn as nn
import numpy as np
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'trained_models')
MODEL_PATH = os.path.join(MODELS_DIR, 'matching_nn.pt')


class MatchingNetwork(nn.Module):
    """
    Feedforward neural network for candidate-job matching.
    
    Input features (7):
        skill_overlap_ratio, avg_skill_gap, weighted_skill_match,
        attendance_score, leave_load, tenure_years, availability
    
    Output: match score (0-1, multiply by 100 for percentage)
    """
    
    def __init__(self, input_size: int = 7, dropout: float = 0.2):
        super().__init__()
        
        self.network = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            
            nn.Linear(32, 16),
            nn.ReLU(),
            
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x).squeeze(-1)


class ProfileMatcher:
    """Wrapper for training and inference with the matching model."""
    
    FEATURE_COLS = [
        'skill_overlap_ratio',
        'avg_skill_gap',
        'weighted_skill_match',
        'attendance_score',
        'leave_load',
        'tenure_years',
        'availability',
    ]
    
    # Normalization: tenure_years max ~10
    NORM_FACTORS = {
        'tenure_years': 10.0,
    }
    
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model: Optional[MatchingNetwork] = None
        self.is_trained = False
        self._load_model()
    
    def _load_model(self):
        """Load model weights if they exist."""
        if os.path.exists(MODEL_PATH):
            try:
                self.model = MatchingNetwork().to(self.device)
                self.model.load_state_dict(torch.load(MODEL_PATH, map_location=self.device, weights_only=True))
                self.model.eval()
                self.is_trained = True
                logger.info("Matching NN model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load matching model: {e}")
                self.model = None
                self.is_trained = False
    
    def _normalize_features(self, features: np.ndarray, columns: list) -> np.ndarray:
        """Normalize features to [0, 1] range."""
        result = features.copy()
        for i, col in enumerate(columns):
            if col in self.NORM_FACTORS:
                result[:, i] = np.clip(result[:, i] / self.NORM_FACTORS[col], 0, 1)
            # Invert avg_skill_gap (lower gap = better)
            if col == 'avg_skill_gap':
                result[:, i] = 1.0 - np.clip(result[:, i], 0, 1)
            # Invert leave_load (less leave = better availability)
            if col == 'leave_load':
                result[:, i] = 1.0 - np.clip(result[:, i], 0, 1)
        return result
    
    def _generate_training_data(self, matching_features_list: list) -> tuple:
        """
        Generate synthetic training pairs from matching features.
        
        Creates pseudo-labels based on a weighted combination:
        - skill_match (50%) + attendance (20%) + tenure (15%) + availability (15%)
        
        This trains the model to learn the nonlinear relationships.
        """
        all_X = []
        all_y = []
        
        for features_df in matching_features_list:
            if features_df.empty:
                continue
            
            available_cols = [c for c in self.FEATURE_COLS if c in features_df.columns]
            X = features_df[available_cols].values.astype(np.float32)
            X = self._normalize_features(X, available_cols)
            
            # Compute pseudo-label for each row
            for row in X:
                # After normalization: all values in [0,1]
                col_idx = {c: i for i, c in enumerate(available_cols)}
                
                skill_score = row[col_idx.get('weighted_skill_match', 0)] if 'weighted_skill_match' in col_idx else 0
                att_score = row[col_idx.get('attendance_score', 0)] if 'attendance_score' in col_idx else 0
                tenure = row[col_idx.get('tenure_years', 0)] if 'tenure_years' in col_idx else 0
                avail = row[col_idx.get('availability', 0)] if 'availability' in col_idx else 0
                
                label = skill_score * 0.50 + att_score * 0.20 + tenure * 0.15 + avail * 0.15
                
                # Add noise for generalization
                label = np.clip(label + np.random.normal(0, 0.05), 0, 1)
                
                all_X.append(row)
                all_y.append(label)
        
        if not all_X:
            raise ValueError("No matching training data available")
        
        return np.array(all_X, dtype=np.float32), np.array(all_y, dtype=np.float32)
    
    def train(self, matching_features_list: list, epochs: int = 80,
              lr: float = 0.001, batch_size: int = 16) -> dict:
        """
        Train the matching model.
        
        Args:
            matching_features_list: list of DataFrames from build_matching_features()
            epochs: training epochs
            lr: learning rate
            batch_size: batch size
            
        Returns:
            dict with training metrics
        """
        X, y = self._generate_training_data(matching_features_list)
        
        # Train/test split
        n = len(X)
        indices = np.random.permutation(n)
        split = max(int(0.8 * n), 1)
        
        input_size = X.shape[1]
        
        X_train = torch.FloatTensor(X[indices[:split]]).to(self.device)
        y_train = torch.FloatTensor(y[indices[:split]]).to(self.device)
        X_test = torch.FloatTensor(X[indices[split:]]).to(self.device)
        y_test = torch.FloatTensor(y[indices[split:]]).to(self.device)
        
        logger.info(f"Training matching model: {len(X_train)} train, {len(X_test)} test samples, {input_size} features")
        
        self.model = MatchingNetwork(input_size=input_size).to(self.device)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr, weight_decay=1e-4)
        criterion = nn.MSELoss()
        
        best_loss = float('inf')
        
        for epoch in range(epochs):
            self.model.train()
            
            perm = torch.randperm(X_train.shape[0])
            X_train = X_train[perm]
            y_train = y_train[perm]
            
            epoch_loss = 0
            n_batches = 0
            
            for i in range(0, len(X_train), batch_size):
                batch_X = X_train[i:i + batch_size]
                batch_y = y_train[i:i + batch_size]
                
                optimizer.zero_grad()
                output = self.model(batch_X)
                loss = criterion(output, batch_y)
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item()
                n_batches += 1
            
            avg_loss = epoch_loss / max(n_batches, 1)
            
            self.model.eval()
            with torch.no_grad():
                if len(X_test) > 0:
                    test_pred = self.model(X_test)
                    test_loss = criterion(test_pred, y_test).item()
                else:
                    test_loss = avg_loss
            
            if test_loss < best_loss:
                best_loss = test_loss
                self._save_model()
            
            if (epoch + 1) % 20 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs} | Train: {avg_loss:.4f} | Test: {test_loss:.4f}")
        
        self.is_trained = True
        self.model.eval()
        
        return {
            'model': 'matching_nn',
            'epochs': epochs,
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'best_test_loss': best_loss,
        }
    
    def predict(self, features: np.ndarray, columns: list) -> np.ndarray:
        """
        Predict match scores for candidates.
        
        Args:
            features: array of shape (n, num_features)
            columns: list of feature column names
            
        Returns:
            array of shape (n,) with scores 0-100
        """
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model is not trained. Call train() first.")
        
        features = self._normalize_features(features, columns)
        
        self.model.eval()
        with torch.no_grad():
            x = torch.FloatTensor(features).to(self.device)
            output = self.model(x)
            return (output.cpu().numpy() * 100).clip(0, 100)
    
    def _save_model(self):
        """Save model weights."""
        os.makedirs(MODELS_DIR, exist_ok=True)
        torch.save(self.model.state_dict(), MODEL_PATH)
        logger.info(f"Matching model saved to {MODEL_PATH}")
