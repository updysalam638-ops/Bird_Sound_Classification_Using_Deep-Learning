from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from django.conf import settings

import os
import numpy as np
import librosa
import json
import tensorflow as tf
from tensorflow.keras.models import load_model

# Load model only once
MODEL_PATH = os.path.join(settings.BASE_DIR, 'model', 'model.h5')
model = load_model(MODEL_PATH)

# Load class labels from JSON
PREDICTION_JSON = os.path.join(settings.BASE_DIR, 'model', 'prediction.json')
with open(PREDICTION_JSON, 'r') as f:
    prediction_dict = json.load(f)

class PredictView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        temp_path = os.path.join(settings.BASE_DIR, 'temp_audio', file.name)
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)

        # Save the uploaded file
        with open(temp_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        try:
            # Load audio
            y, sr = librosa.load(temp_path, sr=22050)

            # Extract MFCC features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
            mfccs_processed = np.mean(mfccs, axis=1)

            # Reshape for model: (1, 40, 1)
            mfccs_processed = np.expand_dims(mfccs_processed, axis=0)
            mfccs_processed = np.expand_dims(mfccs_processed, axis=2)

            # Convert to tensor
            input_tensor = tf.convert_to_tensor(mfccs_processed, dtype=tf.float32)

            # Predict
            predictions = model.predict(input_tensor)
            predicted_index = int(np.argmax(predictions))
            predicted_label = prediction_dict.get(str(predicted_index), "Unknown")
            confidence = float(np.max(predictions)) * 100

            return Response({
                'prediction': predicted_label,
                'confidence': round(confidence, 2)
            })

        except Exception as e:
            return Response({'error': str(e)}, status=500)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
