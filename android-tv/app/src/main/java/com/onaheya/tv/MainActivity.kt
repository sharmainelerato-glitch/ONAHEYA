
package com.onaheya.tv

import android.app.Activity
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false

            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()

            isFocusable = true
            isFocusableInTouchMode = true

            loadUrl("https://onaheya.vercel.app/")
        }

        setContentView(webView)
        webView.requestFocus()
    }

    override fun onKeyDown(
        keyCode: Int,
        event: KeyEvent?
    ): Boolean {
        if (
            keyCode == KeyEvent.KEYCODE_BACK &&
            webView.canGoBack()
        ) {
            webView.goBack()
            return true
        }

        return super.onKeyDown(keyCode, event)
    }
}
