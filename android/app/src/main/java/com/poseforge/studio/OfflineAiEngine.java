package com.poseforge.studio;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.ByteBufferExtractor;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.components.containers.Category;
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.vision.core.RunningMode;
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker;
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult;
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker;
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult;
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenter;
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenterResult;
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker;
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.util.List;

public final class OfflineAiEngine implements AutoCloseable {
    private static final String POSE_MODEL = "models/pose_landmarker_full.task";
    private static final String FACE_MODEL = "models/face_landmarker.task";
    private static final String HAND_MODEL = "models/hand_landmarker.task";
    private static final String SEG_MODEL = "models/selfie_multiclass_256x256.tflite";

    private final PoseLandmarker pose;
    private final FaceLandmarker face;
    private final HandLandmarker hands;
    private final ImageSegmenter segmenter;

    public OfflineAiEngine(Context context) {
        BaseOptions poseBase = BaseOptions.builder().setModelAssetPath(POSE_MODEL).build();
        PoseLandmarker.PoseLandmarkerOptions poseOptions =
                PoseLandmarker.PoseLandmarkerOptions.builder()
                        .setBaseOptions(poseBase)
                        .setRunningMode(RunningMode.IMAGE)
                        .setNumPoses(1)
                        .setMinPoseDetectionConfidence(0.35f)
                        .setMinPosePresenceConfidence(0.35f)
                        .setMinTrackingConfidence(0.35f)
                        .setOutputSegmentationMasks(false)
                        .build();
        pose = PoseLandmarker.createFromOptions(context, poseOptions);

        BaseOptions faceBase = BaseOptions.builder().setModelAssetPath(FACE_MODEL).build();
        FaceLandmarker.FaceLandmarkerOptions faceOptions =
                FaceLandmarker.FaceLandmarkerOptions.builder()
                        .setBaseOptions(faceBase)
                        .setRunningMode(RunningMode.IMAGE)
                        .setNumFaces(1)
                        .setMinFaceDetectionConfidence(0.30f)
                        .setMinFacePresenceConfidence(0.30f)
                        .setMinTrackingConfidence(0.30f)
                        .setOutputFaceBlendshapes(true)
                        .build();
        face = FaceLandmarker.createFromOptions(context, faceOptions);

        BaseOptions handBase = BaseOptions.builder().setModelAssetPath(HAND_MODEL).build();
        HandLandmarker.HandLandmarkerOptions handOptions =
                HandLandmarker.HandLandmarkerOptions.builder()
                        .setBaseOptions(handBase)
                        .setRunningMode(RunningMode.IMAGE)
                        .setNumHands(2)
                        .setMinHandDetectionConfidence(0.30f)
                        .setMinHandPresenceConfidence(0.30f)
                        .setMinTrackingConfidence(0.30f)
                        .build();
        hands = HandLandmarker.createFromOptions(context, handOptions);

        ImageSegmenter.ImageSegmenterOptions segmenterOptions =
                ImageSegmenter.ImageSegmenterOptions.builder()
                        .setBaseOptions(BaseOptions.builder().setModelAssetPath(SEG_MODEL).build())
                        .setRunningMode(RunningMode.IMAGE)
                        .setOutputCategoryMask(true)
                        .setOutputConfidenceMasks(false)
                        .build();
        segmenter = ImageSegmenter.createFromOptions(context, segmenterOptions);
    }

    public synchronized String status() {
        try {
            JSONObject o = new JSONObject();
            o.put("ready", true);
            o.put("engine", "MediaPipe Tasks Vision");
            JSONArray caps = new JSONArray();
            caps.put("pose-33");
            caps.put("face-478");
            caps.put("face-blendshapes");
            caps.put("hands-21x2");
            caps.put("person-hair-skin-face-clothes-accessory-segmentation");
            o.put("capabilities", caps);
            return o.toString();
        } catch (Exception e) {
            return "{\"ready\":false}";
        }
    }

    public synchronized String analyzeDataUrl(String dataUrl) {
        long started = System.currentTimeMillis();
        JSONObject root = new JSONObject();
        JSONArray errors = new JSONArray();
        try {
            Bitmap original = decodeDataUrl(dataUrl);
            if (original == null) throw new IllegalArgumentException("Could not decode image.");
            Bitmap bitmap = resizeForInference(original, 1280);
            MPImage mpImage = new BitmapImageBuilder(bitmap).build();

            root.put("ok", true);
            root.put("sourceWidth", original.getWidth());
            root.put("sourceHeight", original.getHeight());
            root.put("analysisWidth", bitmap.getWidth());
            root.put("analysisHeight", bitmap.getHeight());

            try {
                PoseLandmarkerResult r = pose.detect(mpImage);
                JSONArray poses = new JSONArray();
                for (List<NormalizedLandmark> list : r.landmarks()) poses.put(landmarksJson(list));
                root.put("poses", poses);
            } catch (Exception e) {
                errors.put("pose: " + e.getMessage());
                root.put("poses", new JSONArray());
            }

            try {
                FaceLandmarkerResult r = face.detect(mpImage);
                JSONArray facesJson = new JSONArray();
                for (int i = 0; i < r.faceLandmarks().size(); i++) {
                    JSONObject fo = new JSONObject();
                    fo.put("landmarks", landmarksJson(r.faceLandmarks().get(i)));
                    if (r.faceBlendshapes().isPresent() && i < r.faceBlendshapes().get().size()) {
                        JSONArray bs = new JSONArray();
                        for (Category cat : r.faceBlendshapes().get().get(i)) {
                            if (cat.score() < 0.015f) continue;
                            JSONObject b = new JSONObject();
                            b.put("name", cat.categoryName());
                            b.put("score", cat.score());
                            bs.put(b);
                        }
                        fo.put("blendshapes", bs);
                    }
                    facesJson.put(fo);
                }
                root.put("faces", facesJson);
            } catch (Exception e) {
                errors.put("face: " + e.getMessage());
                root.put("faces", new JSONArray());
            }

            try {
                HandLandmarkerResult r = hands.detect(mpImage);
                JSONArray handsJson = new JSONArray();
                for (int i = 0; i < r.landmarks().size(); i++) {
                    JSONObject ho = new JSONObject();
                    ho.put("landmarks", landmarksJson(r.landmarks().get(i)));
                    if (i < r.handedness().size() && !r.handedness().get(i).isEmpty()) {
                        Category top = r.handedness().get(i).get(0);
                        ho.put("handedness", top.categoryName());
                        ho.put("score", top.score());
                    }
                    handsJson.put(ho);
                }
                root.put("hands", handsJson);
            } catch (Exception e) {
                errors.put("hands: " + e.getMessage());
                root.put("hands", new JSONArray());
            }

            try {
                ImageSegmenterResult r = segmenter.segment(mpImage);
                JSONObject seg = new JSONObject();
                JSONArray labels = new JSONArray();
                for (String label : segmenter.getLabels()) labels.put(label);
                seg.put("labels", labels);
                if (r.categoryMask().isPresent()) {
                    MPImage mask = r.categoryMask().get();
                    ByteBuffer buffer = ByteBufferExtractor.extract(mask);
                    buffer.rewind();
                    byte[] bytes = new byte[buffer.remaining()];
                    buffer.get(bytes);
                    seg.put("width", mask.getWidth());
                    seg.put("height", mask.getHeight());
                    seg.put("categoryMaskBase64", Base64.encodeToString(bytes, Base64.NO_WRAP));
                }
                root.put("segmentation", seg);
            } catch (Exception e) {
                errors.put("segmentation: " + e.getMessage());
            }

            root.put("errors", errors);
            root.put("elapsedMs", System.currentTimeMillis() - started);
            return root.toString();
        } catch (Exception e) {
            try {
                root.put("ok", false);
                root.put("error", e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
                root.put("errors", errors);
                return root.toString();
            } catch (Exception ignored) {
                return "{\"ok\":false,\"error\":\"offline AI failure\"}";
            }
        }
    }

    private static JSONArray landmarksJson(List<NormalizedLandmark> list) throws Exception {
        JSONArray a = new JSONArray();
        for (NormalizedLandmark p : list) {
            JSONObject o = new JSONObject();
            o.put("x", p.x());
            o.put("y", p.y());
            o.put("z", p.z());
            if (p.visibility().isPresent()) o.put("visibility", p.visibility().get());
            if (p.presence().isPresent()) o.put("presence", p.presence().get());
            a.put(o);
        }
        return a;
    }

    private static Bitmap decodeDataUrl(String dataUrl) {
        String b64 = dataUrl;
        int comma = dataUrl.indexOf(',');
        if (comma >= 0) b64 = dataUrl.substring(comma + 1);
        byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
        Bitmap decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (decoded == null) return null;
        if (decoded.getConfig() != Bitmap.Config.ARGB_8888) {
            Bitmap copy = decoded.copy(Bitmap.Config.ARGB_8888, false);
            if (copy != null) return copy;
        }
        return decoded;
    }

    private static Bitmap resizeForInference(Bitmap src, int maxSide) {
        int w = src.getWidth(), h = src.getHeight();
        int max = Math.max(w, h);
        if (max <= maxSide) return src;
        float scale = (float) maxSide / (float) max;
        return Bitmap.createScaledBitmap(src, Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)), true);
    }

    @Override public synchronized void close() {
        try { pose.close(); } catch (Exception ignored) {}
        try { face.close(); } catch (Exception ignored) {}
        try { hands.close(); } catch (Exception ignored) {}
        try { segmenter.close(); } catch (Exception ignored) {}
    }
}
