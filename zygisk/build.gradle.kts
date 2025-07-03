plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "es.chiteroman.playintegrityfix"
    compileSdk = 36
    ndkVersion = "28.2.13676358"
    buildToolsVersion = "36.0.0"

    buildFeatures {
        prefab = true
    }

    packaging {
        resources {
            excludes += "**"
        }
    }

    defaultConfig {
        minSdk = 26
        multiDexEnabled = false

        @file:Suppress("UnstableApiUsage")
        externalNativeBuild {
            cmake {
                abiFilters(
                    "arm64-v8a",
                    "armeabi-v7a"
                )

                arguments(
                    "-DCMAKE_BUILD_TYPE=Release",
                    "-DANDROID_STL=none",
                    "-DCMAKE_JOB_POOLS=compile=${Runtime.getRuntime().availableProcessors()}",
                    "-DCMAKE_INTERPROCEDURAL_OPTIMIZATION=ON",
                    "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON"
                )

                val commonFlags = setOf(
                    "-fno-exceptions",
                    "-fno-rtti",
                    "-fvisibility=hidden",
                    "-fvisibility-inlines-hidden",
                    "-ffunction-sections",
                    "-fdata-sections",
                    "-w"
                )

                cFlags += "-std=c23"
                cFlags += commonFlags

                cppFlags += "-std=c++26"
                cppFlags += commonFlags
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            multiDexEnabled = false
            proguardFiles += file("proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    externalNativeBuild {
        cmake {
            path("src/main/cpp/CMakeLists.txt")
            version = "3.30.5+"
        }
    }
}

dependencies {
    implementation(libs.cxx)
    implementation(libs.hiddenapibypass)
}

afterEvaluate {
    tasks.named("assembleRelease") {
        finalizedBy(
            rootProject.tasks["copyZygiskFiles"],
            rootProject.tasks["zip"]
        )
    }
}