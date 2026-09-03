import torch

from satquery_ai.device import get_device


def test_device_is_available():
    device = get_device()

    assert device.type in {"cuda", "cpu"}


def test_cuda_device_when_available():
    device = get_device()

    if torch.cuda.is_available():
        assert device.type == "cuda"
