"use client"

import jsPDF from "jspdf"
import { Invoice, Client, User } from "@/types"

/**
 * Generate an invoice PDF and return as Uint8Array
 */
export function generateInvoicePDF(
    invoice: Invoice,
    client: Client,
    userProfile: User
): Uint8Array {
    const doc = new jsPDF()

    // Set font
    doc.setFont("helvetica")

    // Header
    doc.setFontSize(24)
    doc.setTextColor(102, 126, 234) // Primary color
    doc.text("FACTUUR", 20, 30)

    // Company Info (Right side)
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)

    const { companyName, address, kvkNumber, vatNumber } =
        userProfile.businessInfo

    if (companyName) doc.text(companyName, 120, 30)
    if (address?.street) doc.text(address.street, 120, 38)
    if (address?.postalCode && address.city) {
        doc.text(`${address.postalCode} ${address.city}`, 120, 46)
    }
    if (kvkNumber) doc.text(`KvK: ${kvkNumber}`, 120, 54)
    if (vatNumber) doc.text(`BTW: ${vatNumber}`, 120, 62)

    // Invoice details
    doc.setFontSize(10)
    doc.text(`Factuurnummer: ${invoice.invoiceNumber}`, 20, 55)
    doc.text(
        `Factuurdatum: ${new Date(
            invoice.invoiceDate.seconds * 1000
        ).toLocaleDateString("nl-NL")}`,
        20,
        62
    )
    doc.text(
        `Vervaldatum: ${new Date(
            invoice.dueDate.seconds * 1000
        ).toLocaleDateString("nl-NL")}`,
        20,
        69
    )

    // Client info
    doc.setFontSize(12)
    doc.setTextColor(102, 126, 234)
    doc.text("Factuuradres:", 20, 85)

    doc.setTextColor(0, 0, 0)
    doc.text(`${client.firstName} ${client.lastName}`, 20, 93)
    if (client.companyName) doc.text(client.companyName, 20, 101)
    if (client.address?.street) doc.text(client.address.street, 20, 109)
    if (client.address?.postalCode && client.address.city) {
        doc.text(`${client.address.postalCode} ${client.address.city}`, 20, 117)
    }

    // Table header
    const tableStartY = 140
    doc.setFontSize(10)
    doc.setTextColor(102, 126, 234)
    doc.text("Omschrijving", 20, tableStartY)
    doc.text("Aantal", 120, tableStartY)
    doc.text("Prijs", 140, tableStartY)
    doc.text("BTW", 160, tableStartY)
    doc.text("Totaal", 180, tableStartY)

    // Draw line under header
    doc.setDrawColor(102, 126, 234)
    doc.line(20, tableStartY + 3, 200, tableStartY + 3)

    // Table content
    let yPos = tableStartY + 15
    doc.setTextColor(0, 0, 0)

    invoice.items.forEach((item) => {
        const description =
            item.description.length > 40
                ? item.description.substring(0, 40) + "..."
                : item.description

        doc.text(description, 20, yPos)
        doc.text(item.quantity.toString(), 120, yPos)
        doc.text(`€${item.unitPrice.toFixed(2)}`, 140, yPos)
        doc.text(`${item.vatRate}%`, 160, yPos)
        doc.text(`€${item.lineTotal.toFixed(2)}`, 180, yPos)

        yPos += 10
    })

    // Totals section
    const totalsY = yPos + 20
    doc.setDrawColor(200, 200, 200)
    doc.line(140, totalsY - 5, 200, totalsY - 5)

    doc.text("Subtotaal:", 140, totalsY)
    doc.text(`€${invoice.subtotal.toFixed(2)}`, 180, totalsY)

    doc.text("BTW:", 140, totalsY + 8)
    doc.text(`€${invoice.vatAmount.toFixed(2)}`, 180, totalsY + 8)

    doc.setDrawColor(102, 126, 234)
    doc.line(140, totalsY + 13, 200, totalsY + 13)

    doc.setFontSize(12)
    doc.setTextColor(102, 126, 234)
    doc.text("Totaal:", 140, totalsY + 22)
    doc.text(`€${invoice.totalAmount.toFixed(2)}`, 180, totalsY + 22)

    // Payment terms
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const paymentY = totalsY + 40
    doc.text("Betalingsvoorwaarden:", 20, paymentY)
    doc.text(
        `Betaling binnen ${userProfile.preferences.defaultPaymentTerms} dagen na factuurdatum.`,
        20,
        paymentY + 8
    )

    if (invoice.notes) {
        doc.text("Opmerkingen:", 20, paymentY + 20)
        const splitNotes = doc.splitTextToSize(invoice.notes, 170)
        doc.text(splitNotes, 20, paymentY + 28)
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(
        "Deze factuur is gegenereerd door Adobe Editor Dashboard",
        20,
        280
    )

    // Output
    const pdfOutput = doc.output("arraybuffer")
    return new Uint8Array(pdfOutput)
}

/**
 * Download a PDF in the browser
 */
export function downloadPDF(pdfBuffer: Uint8Array, filename: string) {
    const blob = new Blob([pdfBuffer], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
}