"""Prepare the supplied SVG's six rigid letters and their contact points."""
import json
import math
import re
import sys
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw, ImageChops

folder = Path(__file__).parent
source = Path(sys.argv[1])
root = ET.parse(source).getroot()
viewbox = list(map(float, root.get('viewBox').split()))
letters = []
for element in root:
    tokens = re.findall(r'[MmLlCcHhVvZz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?', element.get('d', ''))
    index = 0
    point = (0., 0.)
    start = point
    commands, polygons, polygon, samples = [], [], [], []
    while index < len(tokens):
        if tokens[index].isalpha():
            command = tokens[index]
            index += 1
        if command.upper() == 'Z':
            commands.append(['Z'])
            point = start
            if polygon: polygons.append(polygon)
            polygon = []
            continue
        size = {'M': 2, 'L': 2, 'C': 6, 'H': 1, 'V': 1}[command.upper()]
        values = list(map(float, tokens[index:index + size]))
        index += size
        relative = command.islower()
        upper = command.upper()
        if upper in ('M', 'L'):
            end = (values[0] + (point[0] if relative else 0), values[1] + (point[1] if relative else 0))
            commands.append([upper, *end])
            if upper == 'M':
                if polygon: polygons.append(polygon)
                polygon = []
                start = end
                command = 'l' if relative else 'L'
            polygon.append(end)
        elif upper in ('H', 'V'):
            end = (values[0] + (point[0] if relative else 0), point[1]) if upper == 'H' else (point[0], values[0] + (point[1] if relative else 0))
            commands.append(['L', *end])
            polygon.append(end)
        else:
            controls = [(values[i] + (point[0] if relative else 0), values[i + 1] + (point[1] if relative else 0)) for i in (0, 2, 4)]
            commands.append(['C', *(n for pair in controls for n in pair)])
            for step in range(1, 49):
                t = step / 48
                polygon.append(tuple((1-t)**3*point[d] + 3*(1-t)**2*t*controls[0][d] + 3*(1-t)*t*t*controls[1][d] + t**3*controls[2][d] for d in (0, 1)))
            end = controls[-1]
        point = end
    if polygon: polygons.append(polygon)
    mask = Image.new('1', (math.ceil(viewbox[2]), math.ceil(viewbox[3])))
    for polygon in polygons:
        layer = Image.new('1', mask.size)
        ImageDraw.Draw(layer).polygon(polygon, fill=1)
        mask = ImageChops.logical_xor(mask, layer)
        samples.extend(polygon)
    bounds = mask.getbbox()
    letters.append({'commands': commands, 'bounds': bounds, 'mask': mask, 'samples': np.array(samples)})

montage = Image.new('RGB', (math.ceil(viewbox[2]), math.ceil(viewbox[3])), 'white')
draw = ImageDraw.Draw(montage)
colors = ['#d95f02', '#1b9e77', '#7570b3', '#e7298a', '#66a61e', '#e6ab02']
contacts = []
for i, letter in enumerate(letters):
    montage.paste(colors[i], mask=letter['mask'])
for i, letter in enumerate(letters):
    x1, y1, x2, y2 = letter['bounds']
    draw.text(((x1+x2)/2, (y1+y2)/2), str(i), fill='white', stroke_width=2, stroke_fill='black', font_size=44)
    for j in range(i):
        other = letters[j]
        overlap = np.asarray(ImageChops.logical_and(letter['mask'], other['mask']))
        ys, xs = np.where(overlap)
        if len(xs):
            # Select a point well inside the overlap, rather than a gap between disjoint overlap areas.
            cx, cy = float(np.mean(xs)), float(np.mean(ys))
            nearest = np.argmin((xs-cx)**2 + (ys-cy)**2)
            contact = [float(xs[nearest]), float(ys[nearest])]
            distance = 0.
        else:
            best, pair = float('inf'), None
            a, b = letter['samples'], other['samples']
            for offset in range(0, len(a), 64):
                distances = ((a[offset:offset+64, None, :] - b[None, :, :])**2).sum(axis=2)
                k, l = np.unravel_index(np.argmin(distances), distances.shape)
                if distances[k, l] < best:
                    best, pair = distances[k, l], (a[offset+k], b[l])
            distance = math.sqrt(best)
            contact = ((pair[0]+pair[1])/2).tolist()
        contacts.append({'a': j, 'b': i, 'distance': round(distance, 3), 'point': contact})
montage.save(folder / 'letters.png')
data = {'viewBox': viewbox, 'letters': [{k: v for k, v in letter.items() if k in ('commands', 'bounds')} for letter in letters], 'contacts': contacts}
# The SVG order is e3, e1, e2, d, a, B. The connected reading order is Beeeda.
chain = [5, 1, 2, 0, 3, 4]
joints = []
for a, b in zip(chain, chain[1:]):
    contact = next(c for c in contacts if {c['a'], c['b']} == {a, b})
    assert contact['distance'] == 0, 'Adjacent letters must overlap in the original SVG.'
    joints.append(np.array(contact['point']))
root_center = np.mean(np.array(letters[chain[0]]['bounds']).reshape(2, 2), axis=0)
frames, bounds = [], []
def pose(phase):
    transforms = [None] * 6
    for position, letter_index in enumerate(chain):
        angle = math.radians(5 * (math.sin(phase-position*.72)-math.sin(-position*.72)) + 2*math.sin(phase))
        rotation = np.array([[math.cos(angle), -math.sin(angle)], [math.sin(angle), math.cos(angle)]])
        if position == 0:
            shift = root_center - rotation @ root_center + np.array([8*math.sin(phase), 6*math.sin(phase)])
        else:
            previous_rotation, previous_shift = transforms[chain[position-1]]
            joint = joints[position-1]
            shift = previous_rotation @ joint + previous_shift - rotation @ joint
            assert np.linalg.norm(rotation @ joint + shift - (previous_rotation @ joint + previous_shift)) < 1e-8
        transforms[letter_index] = (rotation, shift)
    return transforms
for frame in range(240):
    transforms = pose(frame / 240 * 2*math.pi)
    frames.append([[float(r[0,0]), float(r[1,0]), float(r[0,1]), float(r[1,1]), float(t[0]), float(t[1])] for r, t in transforms])
    for letter, (rotation, shift) in zip(letters, transforms):
        points = letter['samples'] @ rotation.T + shift
        bounds.append([points[:,0].min(), points[:,1].min(), points[:,0].max(), points[:,1].max()])
for (r0,t0), (r1,t1) in zip(pose(0), pose(2*math.pi)):
    assert np.allclose(r0,r1) and np.allclose(t0,t1), 'The animation must close seamlessly.'
extent = np.array(bounds)
low = extent[:,:2].min(axis=0)
high = extent[:,2:].max(axis=0)
width, height = 1080, 1350
scale = min(width*.84/(high[0]-low[0]), height*.86/(high[1]-low[1]))
center = (low+high)/2
data.update({'width':width,'height':height,'fps':30,'seconds':8,'frames':frames,
             'layout':[float(scale),float(width/2-scale*center[0]),float(height/2-scale*center[1])]})
(folder / 'snake.json').write_text(json.dumps(data))
assert len(letters) == 6
print(json.dumps({'bounds': [l['bounds'] for l in letters], 'nearby': [c for c in contacts if c['distance'] < 12]}, indent=2))
