plugins { id("com.android.application") }

android {
    namespace = "com.poseforge.studio"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.poseforge.studio"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.3.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

val syncWebAssets by tasks.registering(Copy::class) {
    from(rootProject.file("../web"))
    into(layout.projectDirectory.dir("src/main/assets/www"))
}

tasks.named("preBuild").configure { dependsOn(syncWebAssets) }


dependencies {
    implementation("com.google.mediapipe:tasks-vision:1.0.0")
}
