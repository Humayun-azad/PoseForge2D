# PoseForge 2D Studio

PoseForge 2D is an offline-first 2D character and scene editor for Android and browsers. The project is modular so another coding AI or developer can continue it without reverse-engineering a monolith.

## What works in v0.15

- Import real photos, anime, manga, cartoons, illustrations, and stylized humanoid raster art.
- Bengali-first UI with an instant বাংলা / English language switch. User-facing controls can be changed at any time without changing project data.
- Easy body-region editor for head, neck, chest/upper torso, left/right chest soft regions, abdomen, waist, hips/glute area, upper/lower arms, hands, thighs, lower legs and feet. AI pose landmarks improve region placement; approximate fallbacks keep the controls usable before analysis.
- Tap-to-pick body regions with movement, rotation and direct soft-drag controls. Width/height reshaping now uses reciprocal scaling so the selected region keeps approximately the same 2D area instead of acting like an arbitrary size changer. Region edits use the existing soft deformable mesh and are saved with the project.
- Natural Soft Body gestures add Move, Pull, Push/Compress, Bend and Twist on any selected body region. Pull/Push use directional reciprocal deformation so the local area stays approximately constant instead of behaving like a size slider.
- Character-adaptive region profiles sample the imported silhouette/alpha around the selected region when possible, so the same gesture reacts to the original visible shape instead of one fixed universal body size.
- Smart Joint Drag provides two-bone IK for wrists/ankles and FABRIK-style finger chains for fingertips. Limb segment lengths are preserved while connected elbow/knee/finger joints bend automatically.
- Mesh smoothing is available after strong edits to soften harsh local folds without resetting the pose.
- Quick pose presets include Hands Front, Arms Up and Swim Reach. They use MediaPipe pose landmarks plus soft mesh deformation; large pose changes can still require masking/repair because offline generative inpainting is not bundled yet.
- Character imports preserve the original image and automatically try offline person segmentation to remove the source background. Manual Remove Background and Restore Original controls are included.
- Easy occlusion tools can move one character behind another, keep only the hidden character's face/head in front, or bring the currently selected body region forward as an editable front-pass layer. This supports simple hidden-body/visible-hand scene construction without forcing users to paint masks first.
- v0.11 adds dynamic semantic depth passes: the selected body region, the outward chain from that region, or an entire limb can be rendered in front of or behind another character while the rest of the owner remains at its original depth. The semantic pass re-renders from the owner, so pose/mesh edits continue to follow instead of freezing a one-time crop.
- Cover/reveal shortcuts include cover-except-face and face-plus-hands-in-front. Precision Mask remains available for edge cleanup when automatic region geometry is imperfect.
- v0.11 semantic contact anchors connect a selected hand/foot limb to a named body region on another character. Two-bone IK preserves measured limb segment lengths as the target moves, within reach limits.

- v0.12 adds a **General Interaction Graph** instead of treating one example as the feature boundary.
- v0.13 expands the interaction system with **reciprocal contacts** so both characters can independently hold/contact one another instead of only one side following the other.
- v0.13 adds **soft contact response**: a user-triggered local soft-body deformation can be applied at the chosen target region for contact/pressure scenes without turning it into an automatic permanent physics simulation.
- v0.13 adds **pair follow** to preserve the arranged spacing of an interacting pair while the target character is moved, plus a stronger optional solver pass for dense multi-contact setups.
- v0.15 adds a **General Object Studio**: import arbitrary raster objects into the same editable scene, move/rotate/scale them with normal layer tools, keep the original source, and optionally remove edge-connected backgrounds locally.
- Object assets can be saved to a dedicated on-device Object Library and restored into later Studio projects.
- v0.15 adds **human ↔ object interaction** on top of the existing interaction graph. Hands, feet, elbows, knees, and major body regions can target a user-picked point on an object. Limb contacts reuse the existing IK/reach solver instead of being limited to named object presets.
- Two-hand holds create independent left/right hand contacts around the chosen grip point. Object-follow can attach an object to one body anchor or the midpoint/angle of both hands, with optional two-hand scale response.
- Object/character depth controls can put the object in front/behind a character and can bring selected gripping hands in front of the object. Local object pressure can drive the existing soft-body mesh response on a chosen body region.
- Object interaction state serializes with normal `.pose2d` projects. This is a general contact/depth foundation rather than a hard-coded chair/ball/phone system. Finger-wrap fitting to arbitrary object silhouettes is still a later refinement.
- v0.14 adds a **Repair Studio** with user-painted repair masks, brush size, Preview → Accept/Retry/Cancel workflow, optional auto-preview, and non-destructive accepted repairs as separate editable overlay layers.
- Offline mode now has a real network-free **local pixel reconstruction** path for small gaps, tears, transparent holes, and texture continuation. It uses neighboring/mirrored visible pixels and is deliberately not described as a neural generator for large unseen anatomy.
- Online repair remains provider-neutral and can receive the source image, mask, repair instruction, seed, and strategy through the existing `/reconstruct` adapter. For real-person repair, the built-in instruction requests only visible neutral or clothing-consistent reconstruction.
- v0.14 adds **Scene Harmony Pro** for background-relative brightness, contrast, saturation, warm/cool balance, sharpness/blur, grain, contact shadow, and cast-shadow harmonization. The same controls apply to photo, anime, manga, cartoon, and illustration layers.
- Repair masks and accepted repair overlays serialize with normal `.pose2d` projects. Accepted repairs stay independently editable instead of destructively replacing the source image.

- v0.15 adds **Object Studio**. Arbitrary raster objects can be imported as normal editable layers, transformed, ordered in front/behind characters, saved to a local Object Library, and restored non-destructively to their original source.
- Object preparation includes an offline edge-connected background remover for simple object photos. Difficult silhouettes stay compatible with the existing Precision Mask cleanup workflow.
- Human ↔ object contacts reuse the general interaction solver: a hand, foot, elbow, or knee can be solved to a picked point on an object, with live contact and auto-reach where possible.
- Two-hand hold places both hands on configurable grip points across the object instead of relying on a named object preset.
- v0.15 also includes **approximate finger grip fitting** when hand landmarks are available. Finger chains bend toward the selected grip point and remain editable through the existing hand/mesh tools. This is a practical 2D approximation, not full 3D grasp physics.
- Objects can follow a selected body anchor, or follow both hands while tracking hand-to-hand angle. Optional two-hand distance scaling is available for suitable props.
- Object depth helpers can place the prop in front/behind the person and create hand-front semantic passes for grip overlap.
- User-triggered object pressure can apply a local soft-body response to a chosen visible body region. It remains an editable 2D deformation, not a claim of full biomechanical simulation.

- Source anchors now also expose shoulders and hips for broader body-to-body positioning. Presets remain shortcuts only; the same manual contact tools work for single-character self-contact and multi-character scenes.
- A character can keep multiple simultaneous contacts to another character or to its own body.
- Source anchors include hands, feet, elbows, knees and body anchors; targets include major visible body regions and joints. Exact target offsets and tap-to-pick contact points make placement less preset-bound.
- Hand/foot contacts use the existing two-bone IK foundation, elbow/knee contacts use constrained mid-joint solving, and live contacts keep following a moving target. Auto-reach can move the source character closer when a limb cannot reach without stretching the measured limb chain.
- Contact depth can keep the current order or reuse v0.11 semantic depth to bring the source limb in front / send it behind. Contacts are stored on the character and therefore travel with normal project serialization.
- Pair helpers and starting shortcuts cover face-off/argument, hand-hold, close embrace, wrestle/clinch, push, block, kick and carry/support. These remain shortcuts only; manual pose, mesh, contact and depth editing continues afterwards.
- The same system also supports single-character self-contact, with quick starts such as hand-to-head or hands-to-hips/chest.
- v0.14 adds **Repair Studio** with a user-painted repair mask and explicit **Preview → Accept / Retry / Cancel** workflow. Repair stays user-triggered by default, with optional Auto Preview.
- Offline mode now has a deterministic local context-repair engine for small/medium visible gaps and edge damage. It is useful for cleanup and continuity, but is intentionally documented as **not** a neural generator for large unseen anatomy.
- Online repair remains provider-neutral and can receive the editable repair mask, safe visible-region instruction, strategy, and retry seed through the existing reconstruct contract.
- Accepted repairs are stored as separate editable repair-overlay layers instead of destructively replacing the original character image.
- v0.14 adds **Scene Harmony Pro** to jointly match exposure, color temperature, contrast, saturation, blur/detail, grain, contact-shadow strength and cast-shadow softness against the current background, for one selected layer or all scene characters.

- Up to 25 active character layers in one studio; extracted body-part layers do not count toward that limit.
- Drag/move, exact rotation, independent X/Y scale, flip, opacity, bend warp, layer ordering.
- Easy transform handles and quick person scaling/movement controls.
- Local deformable 2D mesh with soft-radius/strength controls. Mesh control points directly warp image pixels.
- Pose-driven deformation: after Offline Analyze, AI pose joints can be bound to the local mesh and dragged to softly deform nearby pixels.
- Mesh deformation is serialized in `.pose2d` projects and character-library entries.
- Hand/finger landmarks can also be bound to the mesh for local hand deformation.
- Non-destructive precision mask brush supports hide/reveal occlusion editing and saves with the project.
- Face expression controls use offline face landmarks plus local mesh deformation for smile/frown, mouth open, brows, eye openness and jaw/chin movement.
- Contact anchors can pin a selected layer/part to another layer so it follows position and optional rotation.
- **Cut Part**: draw a polygon on a character, extract that region into an independent editable body-part layer, and erase it from the working base layer. Edge feathering is supported.
- Background import and body-part-level occlusion through normal layer ordering.
- Movement connections/groups between characters.
- Character library, pose library, local autosave, snapshots, portable `.pose2d` project files, and PNG export.
- Offline/online AI adapter boundary with no paid API hard-coded.
- Android WebView shell with native export to Downloads.

## Unified lighting engine

The same lighting controls are available for photo, anime, manga, cartoon, and illustration layers. PoseForge does **not** switch to a weaker toolset for non-photographic art. The renderer preserves the source style while changing scene harmony.

Per-layer lighting includes brightness, contrast, saturation, hue, warm/cool balance, directional light intensity, light angle, light softness, contact shadow, and cast-shadow blur. **Match Scene** samples the background and applies a style-preserving luminance, saturation, contrast, color-temperature, and light-direction match to every character/part layer.

This is deliberately style-agnostic: a human photo stays photographic, anime stays anime, and cartoon linework stays cartoon-like because the lighting pass operates on the supplied pixels rather than converting the artwork into a different visual style.

## AI status

Offline MediaPipe pose, face, hand and semantic person/clothes/body-skin segmentation models are bundled by the Android build. v0.15 uses those body, face and hand landmarks to drive local deformable mesh editing, smart limb IK and finger-chain posing. Full neural generative reconstruction/inpainting is still not bundled. v0.15 keeps the v0.14 offline masked local-pixel repair for small missing areas, while large unseen-region generation still requires a compatible online endpoint or a future offline model pack. Semantic depth masks are landmark/region geometry, not a full neural per-limb segmentation model, so difficult silhouettes can still need Precision Mask cleanup.

See `models/README.md`, `docs/AI_HANDOFF.md`, and `server-contract/openapi.yaml`.

## Android build

GitHub Actions builds a debug APK on pushes that change the Android or web code. The workflow uses Java 17, Gradle 8.9, Android SDK setup, runs JavaScript syntax checks, builds `assembleDebug`, and uploads the APK as an Actions artifact.

Local Android Studio users can open the `android/` directory. The Android Gradle project automatically syncs `web/` into the packaged WebView assets before every build.

## Future update friendliness

The core editor, AI adapters, Android shell, project schema, model notes, and server contract are separated. Give the repository plus `docs/AI_HANDOFF.md` to another coding AI. It documents the stable boundaries and update checklist.

## Safety / intended use

Use images you own or have permission to edit. The shipped editor provides general-purpose character/body-part transforms and does not bundle explicit sexual-anatomy-specific automation. It must not be used to create non-consensual intimate imagery or sexual content involving minors.

## License

MIT. Third-party AI models added later may have their own licenses.

Build target: v0.15 Object Studio + human/object contact and follow + v0.14 masked repair preview + scene harmony + general single/multi-character interaction studio + natural full-body soft deformation + size-locked local shaping + smart limb/finger IK + semantic region/limb depth splitting + automatic character cutout + bilingual UI + deformable mesh + face + hand + masks + offline-vision APK.
