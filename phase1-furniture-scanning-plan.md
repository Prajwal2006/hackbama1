# Phase 1: Real-World Furniture Scanning

**Goal:** Scan real furniture into a digital twin that looks like the real item and fits accurately inside a virtual dorm room.

This is **not** an image-generation problem. It is a **3D capture and reconstruction pipeline**.

---

## Overview

1. **Capture the real object** — Scan a desk, chair, bed, or shelf using a supported phone and a guided scanning workflow.
2. **Reconstruct its digital twin** — Combine depth/geometry data with camera images to preserve the object's shape, colors, textures, and visible wear.
3. **Test it in the dorm** — Place the scanned model in a virtual room, check dimensions and clearances, and let incoming students preview the actual furniture before reserving it.

---

## 1. What the System Must Capture

- **Geometry:** The furniture's 3D shape, edges, legs, and overall structure.
- **Appearance:** Real colors, wood grain, fabric, patterns, scratches, and visible wear.
- **Dimensions:** Width, depth, and height, confirmed by measurement rather than assumed from the visual model.
- **Placement information:** The object's scale and orientation so the room planner can position it correctly.

> LiDAR helps estimate geometry and depth, while RGB camera data supplies appearance. Neither guarantees a perfect scan on its own.

---

## 2. Recommended Technical Approach

Don't build your own scanning algorithm during a hackathon. First, prove the workflow using existing scanning technology, then build the product around it.

### A. Scan individual furniture — Polycam

- Prototype with Polycam.
- Test whether a LiDAR capture produces a sufficiently detailed, textured mesh and export it as **GLB** (Polycam documents GLB mesh export, which suits a browser-based planner).
- **Goal:** A real chair or desk becomes a reusable 3D asset.

### B. Scan the dorm room — Apple RoomPlan

- Investigate Apple RoomPlan. It uses the camera, LiDAR, and ARKit to reconstruct room structure and estimate dimensions.
- Output is useful for room layout, but recognized furniture objects are parametric representations, **not** guaranteed detailed scans of each item's real appearance.
- **Goal:** A room model with walls, doors, windows, and usable spatial measurements.

### C. Build the room planner — Three.js / React Three Fiber

- Render the room and furniture in the browser.
- Load the scanned mesh, apply the verified dimensions, and let users move and rotate it.
- **Goal:** A buyer can see whether the actual item fits their room before reserving it.

> **Constraint:** RoomPlan is an Apple native framework, so integrating it directly means building an iOS capture component. It can't be called from an ordinary web page. For the hackathon, exporting a scan from an existing app and importing it into the web application may be the fastest first proof.

---

## 3. First Sprint Deliverables

### Deliverable 1: A real scan
- Scan one physical chair using a supported LiDAR device.
- Export the model with its texture.
- Record dimensions independently to evaluate accuracy.

### Deliverable 2: A digital twin viewer
- Import the exported asset into a web page.
- Let the user rotate and zoom.
- Preserve the object's real appearance rather than substituting a generic model.

### Deliverable 3: Verified scale
- Show width, depth, and height.
- Let the owner correct and confirm the measurements.
- Store measurements separately from the mesh.

### Deliverable 4: Room fit
- Create one sample dorm room.
- Add the scanned furniture, allow movement and rotation.
- Flag basic overlaps or objects extending outside the room.

---

## 4. Success Criteria

Don't judge success only by how realistic the 3D model looks.

| Test | What we need |
|---|---|
| Visual fidelity | Correct color, texture, shape, and visible wear |
| Geometry | No major holes or missing structural parts |
| Dimensions | Compare scan estimates against physical measurements |
| Room fit | Correct scale and meaningful overlap checks |
| Portability | Model opens reliably in the browser |
| Performance | Scan and reconstruction finish in a reasonable demo time |

For the first prototype, test a **wooden chair or small desk** before attempting a bed or a whole room full of objects.

---

## 5. End-to-End Product Flow

1. **Student scans existing furniture** — depth + camera appearance
2. **Textured 3D digital twin** — mesh + textures + verified dimensions
3. **Furniture Bank inventory** — saved asset tied to one actual item
4. **Incoming student tests room fit** — preview → reserve → scheduled delivery

The last connection is what makes this more than a scanning demo: the 3D model represents the *actual* piece of furniture in the inventory, not a similar-looking chair from an online catalog.

---

## Recommendation

Keep the first milestone very narrow: **scan one real chair, render it faithfully in a browser, verify its scale, and place it in a virtual dorm room.** Once that works, connect it to the furniture listings and reservation system.

---

## References

- Polycam (website, API and export documentation)
- Apple RoomPlan documentation
- Three.js
- React Three Fiber
