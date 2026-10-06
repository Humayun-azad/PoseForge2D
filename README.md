# PoseForge 2D Studio

PoseForge 2D is an offline-first 2D character and scene editor for Android and browsers. The project is modular so another coding AI or developer can continue it without reverse-engineering a monolith.

## What works in v0.5

- Import real photos, anime, manga, cartoons, illustrations, and stylized humanoid raster art.
- Up to 25 active character layers in one studio; extracted body-part layers do not count toward that limit.
- Drag/move, exact rotation, independent X/Y scale, flip, opacity, bend warp, layer ordering.
- Easy transform handles and quick person scaling/movement controls.
- Local deformable 2D mesh with soft-radius/strength controls. Mesh control points directly warp image pixels.
- Pose-driven deformation: after Offline Analyze, AI pose joints can be bound to the local mesh and dragged to softly deform nearby pixels.
- Mesh deformation is serialized in `.pose2d` projects and character-library entries.
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

Offline MediaPipe pose, face, hand and semantic person/clothes/body-skin segmentation models are bundled by the Android build. v0.5 uses those pose landmarks to drive the local deformable mesh. Generative reconstruction/inpainting is still not bundled, so the Repair action requires a compatible online endpoint or a future offline model pack.

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

Build target: v0.5 deformable-mesh + offline-vision APK.
