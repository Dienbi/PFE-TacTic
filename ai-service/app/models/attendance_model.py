"""
Attendance Predictor — LSTM model that predicts next 7 days absence probability
based on a sliding window of daily attendance features.
"""

import torch
import torch.nn as nn
import numpy as np
import os
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'trained_models')
MODEL_PATH = os.path.join(MODELS_DIR, 'attendance_lstm.pt')


class AttendanceLSTM(nn.Module):
    """
    LSTM network for attendance prediction.
    
    Input:  (batch, seq_len=30, features=7)
        Features: was_present, hours_norm, was_late, dow, on_leave, month_sin, month_cos
    Output: (batch, 7) — probability of absence for each of next 7 days
    """
    
    def __init__(self, input_size: int = 7, hidden_size: int = 64,
                 num_layers: int = 2, output_size: int = 7, dropout: float = 0.3):
        super().__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
        )
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, output_size),
            nn.Sigmoid(),  # Output probabilities [0, 1]
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, features)
        lstm_out, _ = self.lstm(x)
        # Take the last timestep output
        last_hidden = lstm_out[:, -1, :]  # (batch, hidden_size)
        return self.fc(last_hidden)  # (batch, 7)


class AttendancePredictor:
    """Wrapper for training and inference with the attendance LSTM model."""
    
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model: Optional[AttendanceLSTM] = None
        self.is_trained = False
        self._load_model()
    
    def _load_model(self):
        """Load model weights if they exist."""
        if os.path.exists(MODEL_PATH):
            try:
                self.model = AttendanceLSTM().to(self.device)
                self.model.load_state_dict(torch.load(MODEL_PATH, map_location=self.device, weights_only=True))
                self.model.eval()
                self.is_trained = True
                logger.info("Attendance LSTM model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load attendance model: {e}")
                self.model = None
                self.is_trained = False
        else:
            logger.info("No trained attendance model found")
    
    def train(self, sequences: dict, epochs: int = 50, lr: float = 0.001,
              batch_size: int = 32) -> dict:
        """
        Train the LSTM model on attendance sequences.
        
        Args:
            sequences: dict of user_id -> (X, y) where X=(n, 30, 7), y=(n, 7)
            epochs: number of training epochs
            lr: learning rate
            batch_size: batch size
            
        Returns:
            dict with training metrics
        """
        # Aggregate all sequences
        all_X = []
        all_y = []
        for uid, (X, y) in sequences.items():
            all_X.append(X)
            all_y.append(y)
        
        if not all_X:
            raise ValueError("No training data available")
        
        X_train_full = np.concatenate(all_X, axis=0)
        y_train_full = np.concatenate(all_y, axis=0)
        
        # Train/test split (80/20)
        n = len(X_train_full)
        indices = np.random.permutation(n)
        split = int(0.8 * n)
        
        X_train = torch.FloatTensor(X_train_full[indices[:split]]).to(self.device)
        y_train = torch.FloatTensor(y_train_full[indices[:split]]).to(self.device)
        X_test = torch.FloatTensor(X_train_full[indices[split:]]).to(self.device)
        y_test = torch.FloatTensor(y_train_full[indices[split:]]).to(self.device)
        
        logger.info(f"Training attendance model: {X_train.shape[0]} train, {X_test.shape[0]} test samples")
        
        # Initialize model
        self.model = AttendanceLSTM().to(self.device)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.BCELoss()
        
        best_loss = float('inf')
        train_losses = []
        test_losses = []
        
        for epoch in range(epochs):
            self.model.train()
            epoch_loss = 0
            n_batches = 0
            
            # Shuffle training data
            perm = torch.randperm(X_train.shape[0])
            X_train = X_train[perm]
            y_train = y_train[perm]
            
            for i in range(0, X_train.shape[0], batch_size):
                batch_X = X_train[i:i + batch_size]
                batch_y = y_train[i:i + batch_size]
                
                optimizer.zero_grad()
                output = self.model(batch_X)
                loss = criterion(output, batch_y)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                optimizer.step()
                
                epoch_loss += loss.item()
                n_batches += 1
            
            avg_train_loss = epoch_loss / max(n_batches, 1)
            train_losses.append(avg_train_loss)
            
            # Evaluate on test set
            self.model.eval()
            with torch.no_grad():
                test_output = self.model(X_test)
                test_loss = criterion(test_output, y_test).item()
                test_losses.append(test_loss)
                
                # Accuracy (threshold 0.5)
                predictions = (test_output > 0.5).float()
                accuracy = (predictions == y_test).float().mean().item()
            
            if test_loss < best_loss:
                best_loss = test_loss
                self._save_model()
            
            if (epoch + 1) % 10 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs} | Train Loss: {avg_train_loss:.4f} | "
                           f"Test Loss: {test_loss:.4f} | Accuracy: {accuracy:.4f}")
        
        self.is_trained = True
        self.model.eval()
        
        return {
            'model': 'attendance_lstm',
            'epochs': epochs,
            'train_samples': X_train.shape[0],
            'test_samples': X_test.shape[0],
            'final_train_loss': train_losses[-1],
            'final_test_loss': test_losses[-1],
            'best_test_loss': best_loss,
            'final_accuracy': accuracy,
        }
    
    def predict(self, sequence: np.ndarray) -> np.ndarray:
        """
        Predict next 7 days absence probability.
        
        Args:
            sequence: array of shape (30, 7) — last 30 days features
            
        Returns:
            array of shape (7,) — probability of being PRESENT each day
        """
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model is not trained yet. Call train() first.")
        
        self.model.eval()
        with torch.no_grad():
            x = torch.FloatTensor(sequence).unsqueeze(0).to(self.device)  # (1, 30, 7)
            output = self.model(x)
            return output.squeeze(0).cpu().numpy()  # (7,)
    
    def _save_model(self):
        """Save model weights."""
        os.makedirs(MODELS_DIR, exist_ok=True)
        torch.save(self.model.state_dict(), MODEL_PATH)
        logger.info(f"Attendance model saved to {MODEL_PATH}")
