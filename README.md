# PoseForge 2D Studio

PoseForge 2D is an offline-first 2D character and scene editor for Android and browsers. The project is modular so another coding AI or developer can continue it without reverse-engineering a monolith.

## What works in v0.10

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

Offline MediaPipe pose, face, hand and semantic person/clothes/body-skin segmentation models are bundled by the Android build. v0.10 uses those body, face and hand landmarks to drive local deformable mesh editing, smart limb IK and finger-chain posing. Generative reconstruction/inpainting is still not bundled, so the Repair action requires a compatible online endpoint or a future offline model pack.

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

Build target: v0.10 natural full-body soft deformation + size-locked local shaping + smart limb/finger IK + automatic character cutout + easy occlusion/front-pass editing + bilingual UI + deformable mesh + face + hand + masks + anchors + offline-vision APK.
