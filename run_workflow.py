
import requests
import json
import base64

workflow = {
"prompt": {
    "4": {"inputs": {"ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors"}, "class_type": "CheckpointLoaderSimple"},
    "5": {"inputs": {"width": 512, "height": 512, "batch_size": 1}, "class_type": "EmptyLatentImage"},
    "6": {"inputs": {"text": "single monkey, painting, canvas, paintbrush, mountains, ice-cap, snow, back-view, art, pallete", "clip": ["4", 1]}, "class_type": "CLIPTextEncode"},
    "7": {"inputs": {"text": "text, watermark", "clip": ["4", 1]}, "class_type": "CLIPTextEncode"},
    "3": {"inputs": {"seed": 804607178953443, "steps": 20, "cfg": 8, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}, "class_type": "KSampler"},
    "8": {"inputs": {"samples": ["3", 0], "vae": ["4", 2]}, "class_type": "VAEDecode"},
    "9": {"inputs": {"filename_prefix": "SD1.5", "images": ["8", 0]}, "class_type": "SaveImage"}
}
}

response = requests.post('http://localhost:3000/prompt', json=workflow)
result = response.json()

for i, img_base64 in enumerate(result['images']):
    img_data = base64.b64decode(img_base64)
    filename = f'output_{i}.png'
    with open(filename, 'wb') as f:
        f.write(img_data)
    size_mb = len(img_data) / 1024 / 1024
    print(f'✓ Saved {filename} ({size_mb:.2f} MB)')

print(f"Total time: {result['stats']['total_time']}ms")
