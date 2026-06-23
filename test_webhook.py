import urllib.request
import urllib.error

try:
    req = urllib.request.Request('https://dami-blue.vercel.app/api/webhook')
    response = urllib.request.urlopen(req)
    print("OK:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("ERROR:", e.code)
    print(e.read().decode('utf-8'))
