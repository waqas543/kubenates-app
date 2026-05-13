package app.rork.kubemanage_mobile_app

import android.util.Base64
import com.facebook.react.bridge.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayInputStream
import java.security.KeyFactory
import java.security.KeyStore
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.security.spec.PKCS8EncodedKeySpec
import java.util.concurrent.TimeUnit
import javax.net.ssl.*

class KubeHttpModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "KubeHttpModule"

    private fun decodePemToBytes(base64Pem: String): ByteArray {
        // kubeconfig values are base64(PEM), so first decode the outer base64
        val pem = String(Base64.decode(base64Pem, Base64.DEFAULT))
        // Strip PEM headers/footers to get the inner base64 DER content
        val innerBase64 = pem.lines()
            .filter { !it.startsWith("-----") && it.isNotBlank() }
            .joinToString("")
        return Base64.decode(innerBase64, Base64.DEFAULT)
    }

    private fun buildClient(
        caCertBase64: String,
        clientCertBase64: String,
        clientKeyBase64: String
    ): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)

        try {
            val certFactory = CertificateFactory.getInstance("X.509")
            var trustManagers: Array<TrustManager>? = null
            var keyManagers: Array<KeyManager>? = null

            // ── Custom CA cert (server verification) ──────────────────
            if (caCertBase64.isNotEmpty()) {
                val caBytes = Base64.decode(caCertBase64, Base64.DEFAULT)
                val caCert = certFactory.generateCertificate(ByteArrayInputStream(caBytes)) as X509Certificate

                val caStore = KeyStore.getInstance(KeyStore.getDefaultType())
                caStore.load(null, null)
                caStore.setCertificateEntry("k8s-ca", caCert)

                val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
                tmf.init(caStore)
                trustManagers = tmf.trustManagers
            }

            // ── Client cert + key (mTLS authentication) ───────────────
            if (clientCertBase64.isNotEmpty() && clientKeyBase64.isNotEmpty()) {
                val certDer = decodePemToBytes(clientCertBase64)
                val keyDer = decodePemToBytes(clientKeyBase64)

                val clientCert = certFactory.generateCertificate(ByteArrayInputStream(certDer)) as X509Certificate

                // Try RSA then EC for PKCS8-encoded keys
                val privateKey = try {
                    KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(keyDer))
                } catch (e: Exception) {
                    KeyFactory.getInstance("EC").generatePrivate(PKCS8EncodedKeySpec(keyDer))
                }

                val keyStore = KeyStore.getInstance(KeyStore.getDefaultType())
                keyStore.load(null, null)
                keyStore.setKeyEntry("k8s-client", privateKey, CharArray(0), arrayOf(clientCert))

                val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
                kmf.init(keyStore, CharArray(0))
                keyManagers = kmf.keyManagers
            }

            if (trustManagers != null || keyManagers != null) {
                val sslContext = SSLContext.getInstance("TLS")
                sslContext.init(keyManagers, trustManagers, null)

                val trustManager = (trustManagers?.filterIsInstance<X509TrustManager>()?.firstOrNull()
                    ?: getDefaultTrustManager())

                builder.sslSocketFactory(sslContext.socketFactory, trustManager)
            }
        } catch (e: Exception) {
            // Certificate setup failed — fall back to default SSL (works for public CAs)
        }

        return builder.build()
    }

    private fun getDefaultTrustManager(): X509TrustManager {
        val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        tmf.init(null as KeyStore?)
        return tmf.trustManagers.filterIsInstance<X509TrustManager>().first()
    }

    @ReactMethod
    fun request(
        url: String,
        method: String,
        headers: ReadableMap,
        body: String?,
        caCertBase64: String,
        clientCertBase64: String,
        clientKeyBase64: String,
        promise: Promise
    ) {
        Thread {
            try {
                val client = buildClient(caCertBase64, clientCertBase64, clientKeyBase64)

                val headersBuilder = Headers.Builder()
                val iter = headers.entryIterator
                while (iter.hasNext()) {
                    val entry = iter.next()
                    headersBuilder.add(entry.key, entry.value.toString())
                }

                val contentType = headers.getString("Content-Type") ?: "application/json; charset=utf-8"
                val mediaType = contentType.toMediaType()
                val requestBody: RequestBody? = when {
                    method == "GET" -> null
                    method == "DELETE" && body.isNullOrEmpty() -> null
                    !body.isNullOrEmpty() -> body.toRequestBody(mediaType)
                    else -> "".toRequestBody(mediaType)
                }

                val request = Request.Builder()
                    .url(url)
                    .method(method, requestBody)
                    .headers(headersBuilder.build())
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                val responseHeaders = Arguments.createMap()
                response.headers.forEach { (name, value) -> responseHeaders.putString(name, value) }

                val result = Arguments.createMap()
                result.putInt("status", response.code)
                result.putString("body", responseBody)
                result.putBoolean("ok", response.isSuccessful)
                result.putMap("headers", responseHeaders)
                result.putMap("request_headers", headers)

                response.close()
                promise.resolve(result)
            } catch (e: SSLHandshakeException) {
                promise.reject("SSL_ERROR", "SSL handshake failed — the server certificate is not trusted: ${e.message}")
            } catch (e: Exception) {
                promise.reject("HTTP_ERROR", e.message ?: "Request failed")
            }
        }.start()
    }
}
