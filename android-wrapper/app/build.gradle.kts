plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val buildApplicationId = (project.findProperty("APPLICATION_ID") as String?)?.trim().takeUnless { it.isNullOrBlank() }
    ?: "com.indodev01.generated"
val buildVersionName = (project.findProperty("VERSION_NAME") as String?)?.trim().takeUnless { it.isNullOrBlank() }
    ?: "1.0"
val liveUrl = (project.findProperty("LIVE_URL") as String?)?.trim().takeUnless { it.isNullOrBlank() }
    ?: "https://indodev01.github.io/Indo/frontend/html/live-app.html"

android {
    namespace = "com.indodev01.generated"
    compileSdk = 35

    defaultConfig {
        applicationId = buildApplicationId
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = buildVersionName
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildTypes {
        getByName("debug") {
            buildConfigField("String", "LIVE_URL", "\"$liveUrl\"")
        }
        getByName("release") {
            isMinifyEnabled = false
            buildConfigField("String", "LIVE_URL", "\"$liveUrl\"")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
}
