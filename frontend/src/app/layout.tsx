import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";
import "ux4g-web-components/styles.css";
import "ux4g-web-components/design-system";
import "./globals.css";
import { HeaderSwitch } from "@/components/HeaderSwitch";
import { FooterSwitch } from "@/components/FooterSwitch";
import { OfflineBanner } from "@/components/OfflineBanner";
import { I18nProvider } from "@/lib/i18n";

const notoSans = Noto_Sans({ subsets: ["latin"], display: "swap", variable: "--font-noto-sans", weight: ["400", "500", "600", "700"] });
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], display: "swap", variable: "--font-noto-devanagari", weight: ["400", "500", "600", "700"] });
const notoTamil = Noto_Sans_Tamil({ subsets: ["tamil"], display: "swap", variable: "--font-noto-tamil", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "PRAHARI | Personnel Welfare & Grievance Resolution Portal | Government of India",
  description: "Personnel Welfare & Grievance Resolution Platform for Central Armed Police Forces. Ministry of Home Affairs / Central Reserve Police Force (CRPF).",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/prahari_logo_trans.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/images/prahari_logo_trans.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning className={`${notoSans.variable} ${notoDevanagari.variable} ${notoTamil.variable} font-sans`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var filterAttrs = ['bis_skin_checked', 'bis_register', 'bis_size'];
                function clean(el) {
                  if (!el || !el.removeAttribute) return;
                  for (var i = 0; i < filterAttrs.length; i++) {
                    if (el.hasAttribute && el.hasAttribute(filterAttrs[i])) {
                      el.removeAttribute(filterAttrs[i]);
                    }
                  }
                }
                if (typeof MutationObserver !== 'undefined') {
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && filterAttrs.indexOf(m.attributeName) !== -1) {
                        m.target.removeAttribute(m.attributeName);
                      } else if (m.type === 'childList') {
                        for (var j = 0; j < m.addedNodes.length; j++) {
                          var node = m.addedNodes[j];
                          if (node && node.nodeType === 1) {
                            clean(node);
                            if (node.querySelectorAll) {
                              var descendants = node.querySelectorAll('*');
                              for (var k = 0; k < descendants.length; k++) {
                                clean(descendants[k]);
                              }
                            }
                          }
                        }
                      }
                    }
                  });
                  if (document.documentElement) {
                    observer.observe(document.documentElement, { attributes: true, subtree: true, childList: true, attributeFilter: filterAttrs });
                  }
                }
                if (typeof window !== 'undefined') {
                  var origError = console.error;
                  console.error = function() {
                    var combined = "";
                    for (var i = 0; i < arguments.length; i++) {
                      try {
                        combined += (typeof arguments[i] === 'string' ? arguments[i] : String(arguments[i])) + " ";
                      } catch(e) {}
                    }
                    if (combined.indexOf('bis_skin_checked') !== -1 || combined.indexOf('bis_register') !== -1) {
                      return;
                    }
                    origError.apply(console, arguments);
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <I18nProvider>
          <HeaderSwitch />
          <OfflineBanner />
          <main id="main-content" className="flex-1 w-full" tabIndex={-1}>
            {children}
          </main>
          <FooterSwitch />
        </I18nProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var bad = document.querySelectorAll('[bis_skin_checked], [bis_register], [bis_size]');
                  for (var i = 0; i < bad.length; i++) {
                    bad[i].removeAttribute('bis_skin_checked');
                    bad[i].removeAttribute('bis_register');
                    bad[i].removeAttribute('bis_size');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
