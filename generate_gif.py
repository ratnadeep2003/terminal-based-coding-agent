import sys
from PIL import Image, ImageDraw

def draw_dot_smiley(frame_type, size=400):
    # Background
    bg_color = (20, 20, 25)
    dot_color = (255, 215, 0) # Gold / Yellow dots
    dim_dot = (60, 60, 70)
    
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    radius = size * 0.4
    
    # Draw face contour with dots
    import math
    num_contour_dots = 36
    for i in range(num_contour_dots):
        angle = 2 * math.pi * i / num_contour_dots
        x = center + radius * math.cos(angle)
        y = center + radius * math.sin(angle)
        r = 8
        draw.ellipse([x-r, y-r, x+r, y+r], fill=dot_color)
        
    # Left eye (open dot)
    lx, ly = center - radius * 0.35, center - radius * 0.25
    r_eye = 14
    draw.ellipse([lx-r_eye, ly-r_eye, lx+r_eye, ly+r_eye], fill=dot_color)
    
    # Right eye (depends on frame_type)
    rx, ry = center + radius * 0.35, center - radius * 0.25
    if frame_type == 'open':
        draw.ellipse([rx-r_eye, ry-r_eye, rx+r_eye, ry+r_eye], fill=dot_color)
    elif frame_type == 'half_wink':
        # Half closed line of dots
        for dx in [-12, 0, 12]:
            draw.ellipse([rx+dx-5, ry-5, rx+dx+5, ry+5], fill=dot_color)
    elif frame_type == 'full_wink':
        # Winking curve or horizontal dash of dots
        for dx in [-16, -8, 0, 8, 16]:
            dy = - (16 - abs(dx)) * 0.3 # slight curve upwards ^
            draw.ellipse([rx+dx-5, ry+dy-5, rx+dx+5, ry+dy+5], fill=dot_color)
            
    # Mouth (smile arc of dots)
    num_smile_dots = 11
    for i in range(num_smile_dots):
        # Angle from 0.2*pi to 0.8*pi
        angle = math.pi * 0.25 + (math.pi * 0.5) * (i / (num_smile_dots - 1))
        sm_r = radius * 0.6
        x = center + sm_r * math.cos(angle)
        y = center - radius * 0.1 + sm_r * math.sin(angle)
        draw.ellipse([x-7, y-7, x+7, y+7], fill=dot_color)
        
    return img

frames = []
# Open (hold)
f_open = draw_dot_smiley('open')
f_half = draw_dot_smiley('half_wink')
f_wink = draw_dot_smiley('full_wink')

# Sequence: Open, Half, Wink, Wink, Half, Open, Open
animation_frames = [f_open, f_open, f_open, f_half, f_wink, f_wink, f_wink, f_half, f_open, f_open]
durations = [300, 300, 300, 100, 250, 250, 250, 100, 300, 300]

animation_frames[0].save(
    'winking_smiley.gif',
    save_all=True,
    append_images=animation_frames[1:],
    duration=durations,
    loop=0
)
print("GIF generated successfully!")
