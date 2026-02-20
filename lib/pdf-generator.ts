import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
// Optional: import standard puppeteer for local development fallback
// import puppeteer from 'puppeteer';

/**
 * Generates a PDF buffer from HTML content.
 * @param htmlContent The HTML content to convert to PDF.
 * @returns A Promise that resolves to a Buffer containing the PDF data or null if it fails.
 */
export async function generatePdfBuffer(htmlContent: string): Promise<Buffer | null> {
    let browser = null;
    try {
        const isLocal = process.env.NODE_ENV === 'development';

        if (isLocal) {
            // Development (Local Windows/Mac) - Using full puppeteer
            const puppeteer = require('puppeteer');
            browser = await puppeteer.launch({
                headless: true,
            });
        } else {
            // Production (Vercel) - Using puppeteer-core + @sparticuz/chromium
            browser = await puppeteerCore.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: true,
            });
        }

        const page = await browser.newPage();

        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0', // Wait for external resources like fonts/images
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px',
            },
        });

        return Buffer.from(pdfBuffer);
    } catch (error) {
        console.error("PDF Generation Error (Non-Fatal):", error);
        return null; // Return null gracefully so the caller can continue
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
