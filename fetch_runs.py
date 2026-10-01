import urllib.request, json
url = 'https://api.github.com/repos/morir886624/quran_video_generator/actions/runs'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    for run in data.get('workflow_runs', [])[:5]:
        print(f"ID: {run['id']} - Name: {run['name']} - Conclusion: {run['conclusion']}")
