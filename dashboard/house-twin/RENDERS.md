# Make your own house renders (AI image guide)

The House twin panel draws live state over three matching pictures of **your** house: `day.jpg`, `dusk.jpg` and `night.jpg`. This kit ships no house images; you make your own with any good image model (ChatGPT, Gemini, Midjourney, a local Stable Diffusion/Flux model, …).

## Privacy first

- The renders are served from `/config/www/`, which anyone on your LAN can read **without logging in**. An illustration is fine there; a real photo of your home, a camera snapshot or anything showing your address is not.
- Uploading photos to a cloud image service shares them with that service. Use photos you're comfortable sharing (a floor plan, an exterior shot without the house number or number plates) or a local model.
- **If you publish your setup** (a video, a GitHub fork, a forum post), remember that a recognisable render of your house plus your street view can identify where you live. Blur or swap it for a generic house.

## What to give the model

Attach as many of these as you have:

1. A **floor plan** (a real-estate listing or a quick sketch with room names)
2. A **front photo** of the house
3. A **top-down aerial** (from a maps app) for the roof shape and garden
4. A few **interior photos** for colours and furniture

## Prompt 1: the day render

> Create a 16:9 isometric cutaway illustration of this house with the roof removed, viewed from a high three-quarter angle, so every room is visible from above. Follow the attached floor plan exactly: same rooms, walls, doors, windows and proportions. Use the exterior photo for materials and colours and the aerial for the roof outline, driveway, garden and any pool. Furnish rooms in the style of the interior photos. Soft daylight. Plain dark background, colour #1a1f24, with an empty margin on the right-hand side. No text, no labels, no people, no cars, no house number.

Ask for changes until the layout is right: rooms in the wrong place matter more than style.

## Prompts 2 and 3: dusk and night, in the same chat

The three images must line up **pixel for pixel**, or the lighting cross-fade looks like the house is moving. So make dusk and night as **edits of the day image, in the same conversation**:

> Edit this exact image. Keep the camera, framing and geometry identical pixel for pixel; change only the lighting to dusk: warm low sun from the west, long soft shadows, a few interior lights on.

> Edit this exact image again. Same camera, framing and geometry pixel for pixel; change only the lighting to night: dark blue ambient light, warm light from the windows and rooms, garden lights, the pool lit if there is one.

Check alignment by flipping between the images in a viewer. If something shifted, ask again ("the garage moved left, keep it exactly where it was").

## Save and size

- Save as `day.jpg`, `dusk.jpg`, `night.jpg`, all the **same pixel size** (1376×768 is a good 16:9 size; any 16:9 works).
- Keep each under about 500 KB (JPEG quality 80–85) so TVs load them quickly.
- Put the size in `CONFIG.render` at the top of `house-twin.js`.

## Map the hotspots

Every position in the CONFIG block is a percentage of the render: `[left %, top %]`.

1. Open `day.jpg` in an editor that shows the cursor position (Paint, GIMP, Photoshop, Paint.NET, or Preview's inspector on a Mac).
2. Hover over the spot (the TV in the lounge, the front door camera, the garage door's top-left corner, the fridge).
3. `left = x ÷ width × 100`, `top = y ÷ height × 100`. Example on a 1376×768 render: a TV at pixel (633, 269) is `[46, 35]`.
4. For the garage door, measure the door's top-left corner and its width and height in % too: `door: [left, top, width, height]`.
5. Save, bump `?v=N` in `module_url`, restart or reload, and nudge values until they sit right.
