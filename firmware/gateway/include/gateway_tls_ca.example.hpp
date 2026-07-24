#pragma once

namespace gateway_tls_ca {

// Compile-only placeholder. Copy this file to gateway_tls_ca.hpp and replace
// the entire value with the broker issuer's trusted CA certificate chain.
inline constexpr char kCertificatePem[] = R"SC_CA(-----BEGIN CERTIFICATE-----
REPLACE_WITH_TRUSTED_CA_CERTIFICATE_BASE64
-----END CERTIFICATE-----
)SC_CA";

}  // namespace gateway_tls_ca
