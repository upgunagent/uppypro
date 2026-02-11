
import puppeteer from 'puppeteer';

/**
 * Generates a PDF buffer from HTML content.
 * @param htmlContent The HTML content to convert to PDF.
 * @returns A Promise that resolves to a Buffer containing the PDF data.
 */
export async function generatePdfBuffer(htmlContent: string): Promise<Buffer> {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });

        const page = await browser.newPage();

        // Emulate screen media to ensure CSS matches what's seen on screen if needed, 
        // but usually print is better for contracts. Let's stick to default or print.
        // await page.emulateMediaType('screen');

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
        console.error("PDF Generation Error:", error);
        throw new Error("PDF oluşturulurken bir hata oluştu.");
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
