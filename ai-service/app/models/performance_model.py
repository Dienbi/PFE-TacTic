"""
Performance Scorer — Feedforward Neural Network that computes an employee
performance score (0-100) from attendance, skills, tenure, and overtime features.
"""

import torch
import torch.nn as nn
import numpy as np
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'trained_models')
MODEL_PATH = os.path.join(MODELS_DIR, 'performance_ffn.pt')


class PerformanceFFN(nn.Module):
    """
    Feedforward neural network for performance prediction.
    
    Input features (9):
        attendance_rate, avg_hours_worked, late_rate, leave_frequency,
        sick_leave_ratio, skill_count, avg_skill_level, tenure_months, overtime_ratio
    
    Output: performance score (0-100)
    """
    
    def __init__(self, input_size: int = 9, dropout: float = 0.3):
        super().__init__()
        
        self.network = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout),
            
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(dropout),
            
            nn.Linear(32, 16),
            nn.ReLU(),
            
            nn.Linear(16, 1),
            nn.Sigmoid(),  # Output [0, 1] — multiply by 100 for score
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x).squeeze(-1)  # (batch,)


class PerformanceScorer:
    """Wrapper for training and inference with the performance model."""
    
    # Feature columns and their normalization ranges
    FEATURE_COLS = [
        'presence_rate',        # already 0-1
        'avg_hours_worked',     # normalize by /12
        'late_rate',            # already 0-1
        'leave_frequency',      # normalize by /10
        'sick_leave_ratio',     # already 0-1
        'skill_count',          # normalize by /10
        'avg_skill_level',      # normalize by /5
        'tenure_months',        # normalize by /60
        'overtime_ratio',       # already 0-1
    ]
    
    NORM_FACTORS = {
        'avg_hours_worked': 12.0,
        'leave_frequency': 10.0,
        'skill_count': 10.0,
        'avg_skill_level': 5.0,
        'tenure_months': 60.0,
    }
    
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model: Optional[PerformanceFFN] = None
        self.is_trained = False
        self._load_model()
    
    def _load_model(self):
        """Load model weights if they exist."""
        if os.path.exists(MODEL_PATH):
            try:
                self.model = PerformanceFFN().to(self.device)
                self.model.load_state_dict(torch.load(MODEL_PATH, map_location=self.device, weights_only=True))
                self.model.eval()
                self.is_trained = True
                logger.info("Performance FFN model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load performance model: {e}")
                self.model = None
                self.is_trained = False
    
    def _normalize_features(self, features: np.ndarray, columns: list) -> np.ndarray:
        """Normalize features to [0, 1] range."""
        result = features.copy()
        for i, col in enumerate(columns):
            if col in self.NORM_FACTORS:
                result[:, i] = np.clip(result[:, i] / self.NORM_FACTORS[col], 0, 1)
        return result
    
    def train(self, employee_features, performance_labels,
              epochs: int = 100, lr: float = 0.001, batch_size: int = 16) -> dict:
        """
        Train the performance model.
        
        Args:
            employee_features: DataFrame with employee features
            performance_labels: DataFrame with 'utilisateur_id' and 'performance_label'
            epochs: training epochs
            lr: learning rate
            batch_size: batch size
            
        Returns:
            dict with training metrics
        """
        import pandas as pd
        
        # Merge features with labels
        data = employee_features.merge(performance_labels, on='utilisateur_id', how='inner')
        
        if len(data) < 5:
            raise ValueError(f"Not enough training data: {len(data)} samples")
        
        # Extract feature matrix
        available_cols = [c for c in self.FEATURE_COLS if c in data.columns]
        X = data[available_cols].values.astype(np.float32)
        y = data['performance_label'].values.astype(np.float32) / 100.0  # Normalize to [0, 1]
        
        # Normalize
        X = self._normalize_features(X, available_cols)
        
        # Train/test split
        n = len(X)
        indices = np.random.permutation(n)
        split = max(int(0.8 * n), 1)
        
        X_train = torch.FloatTensor(X[indices[:split]]).to(self.device)
        y_train = torch.FloatTensor(y[indices[:split]]).to(self.device)
        X_test = torch.FloatTensor(X[indices[split:]]).to(self.device)
        y_test = torch.FloatTensor(y[indices[split:]]).to(self.device)
        
        logger.info(f"Training performance model: {len(X_train)} train, {len(X_test)} test samples, {len(available_cols)} features")
        
        # Initialize model
        self.model = PerformanceFFN(input_size=len(available_cols)).to(self.device)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr, weight_decay=1e-4)
        criterion = nn.MSELoss()
        
        best_loss = float('inf')
        train_losses = []
        
        for epoch in range(epochs):
            self.model.train()
            
            # Shuffle
            perm = torch.randperm(X_train.shape[0])
            X_train = X_train[perm]
            y_train = y_train[perm]
            
            epoch_loss = 0
            n_batches = 0
            
            for i in range(0, len(X_train), batch_size):
                batch_X = X_train[i:i + batch_size]
                batch_y = y_train[i:i + batch_size]
                
                if len(batch_X) < 2:
                    continue  # BatchNorm needs at least 2 samples
                
                optimizer.zero_grad()
                output = self.model(batch_X)
                loss = criterion(output, batch_y)
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item()
                n_batches += 1
            
            avg_loss = epoch_loss / max(n_batches, 1)
            train_losses.append(avg_loss)
            
            # Evaluate
            self.model.eval()
            with torch.no_grad():
                if len(X_test) >= 2:
                    test_pred = self.model(X_test)
                    test_loss = criterion(test_pred, y_test).item()
                    mae = torch.abs(test_pred - y_test).mean().item() * 100
                else:
                    test_loss = avg_loss
                    mae = 0
            
            if test_loss < best_loss:
                best_loss = test_loss
                self._save_model()
            
            if (epoch + 1) % 20 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs} | Train Loss: {avg_loss:.4f} | "
                           f"Test Loss: {test_loss:.4f} | MAE: {mae:.2f}")
        
        self.is_trained = True
        self.model.eval()
        
        return {
            'model': 'performance_ffn',
            'epochs': epochs,
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'features_used': available_cols,
            'final_train_loss': train_losses[-1],
            'best_test_loss': best_loss,
            'final_mae': mae,
        }
    
    def predict(self, features: np.ndarray, columns: list) -> np.ndarray:
        """
        Predict performance scores.
        
        Args:
            features: array of shape (n, num_features)
            columns: list of feature column names
            
        Returns:
            array of shape (n,) with scores 0-100
        """
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model is not trained yet. Call train() first.")
        
        features = self._normalize_features(features, columns)
        
        self.model.eval()
        with torch.no_grad():
            x = torch.FloatTensor(features).to(self.device)
            output = self.model(x)
            return (output.cpu().numpy() * 100).clip(0, 100)  # Scale back to 0-100
    
    def _save_model(self):
        """Save model weights."""
        os.makedirs(MODELS_DIR, exist_ok=True)
        torch.save(self.model.state_dict(), MODEL_PATH)
        logger.info(f"Performance model saved to {MODEL_PATH}")
