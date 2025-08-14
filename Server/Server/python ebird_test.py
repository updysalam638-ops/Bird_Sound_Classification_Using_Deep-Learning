import requests

url = "https://api.ebird.org/v2/data/obs/US-CA/recent"
headers = {
    'X-eBirdApiToken': 'YOUR_EBIRD_API_KEY'  # YOUR_EBIRD_API_KEY 
}

response = requests.get(url, headers=headers)
print(response.json()[:3])
