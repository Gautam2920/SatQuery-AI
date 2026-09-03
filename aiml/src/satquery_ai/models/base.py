from abc import ABC, abstractmethod

import torch


class SatelliteModel(ABC):
    @abstractmethod
    def predict(self, image: torch.Tensor) -> torch.Tensor:
        raise NotImplementedError
