#include "ort-utils.h"

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN

#include <doctest.h>

#include <string>

TEST_CASE("ort-utils") {
  SUBCASE("ort_session_from_path") {
    REQUIRE(ort_session_from_path(nullptr, nullptr, nullptr, "model.onnx",
                                  nullptr, nullptr, nullptr) < 0);
  }
  SUBCASE("ort_session_from_memory") {
    REQUIRE(ort_session_from_memory(nullptr, nullptr, nullptr, nullptr, 0,
                                    nullptr) < 0);
  }
}

TEST_CASE("ort_apply_threading_preferences") {
  const OrtApi *api = OrtGetApiBase()->GetApi(ORT_API_VERSION);
  REQUIRE(api != nullptr);
  const char *spinning_key = "session.intra_op.allow_spinning";
  OrtSessionOptions *session_options = nullptr;

  SUBCASE("defaults leave the session options alone") {
    REQUIRE(api->CreateSessionOptions(&session_options) == nullptr);
    ort_apply_threading_preferences(api, session_options);
    int has_entry = 1;
    REQUIRE(api->HasSessionConfigEntry(session_options, spinning_key,
                                       &has_entry) == nullptr);
    CHECK(has_entry == 0);
    api->ReleaseSessionOptions(session_options);
  }

  SUBCASE("spinning can be turned off and on") {
    for (const bool allow_spinning : {false, true}) {
      ort_set_allow_spinning(allow_spinning);
      REQUIRE(api->CreateSessionOptions(&session_options) == nullptr);
      ort_apply_threading_preferences(api, session_options);
      char value[2] = {0};
      size_t value_size = sizeof(value);
      REQUIRE(api->GetSessionConfigEntry(session_options, spinning_key, value,
                                         &value_size) == nullptr);
      CHECK(std::string(value) == (allow_spinning ? "1" : "0"));
      api->ReleaseSessionOptions(session_options);
    }
  }

  SUBCASE("a thread count is accepted") {
    ort_set_intra_op_threads(2);
    REQUIRE(api->CreateSessionOptions(&session_options) == nullptr);
    ort_apply_threading_preferences(api, session_options);
    api->ReleaseSessionOptions(session_options);
    ort_set_intra_op_threads(0);
  }
}
