plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.indodev01.generated"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.indodev01.generated"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures { buildConfig = true }
    buildTypes {
        release { isMinifyEnabled = false }
    }

    buildTypes.getByName("debug") {
        buildConfigField("String", "LIVE_URL", "\"${project.findProperty("LIVE_URL") ?: "https://indodev01.github.io/Indo/frontend/html/live-app.html"}\"")
    }
    buildTypes.getByName("release") {
        buildConfigField("String", "LIVE_URL", "\"${project.findProperty("LIVE_URL") ?: "https://indodev01.github.io/Indo/frontend/html/live-app.html"}\"")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
}
