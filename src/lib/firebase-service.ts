"use client"

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    DocumentData,
    QueryConstraint,
} from "firebase/firestore"
import { db } from "./firebase"
import { Client, Product, Invoice } from "@/types"

// ----------------- Client Services -----------------
export const clientService = {
    // Create client
    async createClient(
        userId: string,
        clientData: Omit<Client, "id" | "userId" | "createdAt" | "updatedAt">
    ): Promise<Client> {
        const newClient = {
            ...clientData,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }

        const docRef = await addDoc(collection(db, "clients"), newClient)
        return { id: docRef.id, ...newClient } as Client
    },

    // Get all clients for user
    async getClients(userId: string): Promise<Client[]> {
        const q = query(
            collection(db, "clients"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        )

        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Client)
        )
    },

    // Get single client
    async getClient(clientId: string, userId?: string): Promise<Client> {
        const docRef = doc(db, "clients", clientId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) throw new Error("Client not found")

        const clientData = { id: docSnap.id, ...docSnap.data() } as Client

        // If userId is provided, verify ownership
        if (userId && clientData.userId !== userId) {
            throw new Error("Access denied: Client belongs to another user")
        }

        return clientData
    },

    // Update client
    async updateClient(
        clientId: string,
        updateData: Partial<Client>,
        userId?: string
    ): Promise<Client> {
        const docRef = doc(db, "clients", clientId)

        // If userId is provided, verify ownership before updating
        if (userId) {
            const docSnap = await getDoc(docRef)
            if (!docSnap.exists()) throw new Error("Client not found")

            const clientData = docSnap.data() as Client
            if (clientData.userId !== userId) {
                throw new Error("Access denied: Client belongs to another user")
            }
        }

        const updatedData = {
            ...updateData,
            updatedAt: serverTimestamp(),
        }

        await updateDoc(docRef, updatedData)
        return { id: clientId, ...updatedData } as Client
    },

    // Delete client
    async deleteClient(clientId: string, userId?: string): Promise<string> {
        // If userId is provided, verify ownership before deleting
        if (userId) {
            const docRef = doc(db, "clients", clientId)
            const docSnap = await getDoc(docRef)
            if (!docSnap.exists()) throw new Error("Client not found")

            const clientData = docSnap.data() as Client
            if (clientData.userId !== userId) {
                throw new Error("Access denied: Client belongs to another user")
            }
        }

        await deleteDoc(doc(db, "clients", clientId))
        return clientId
    },

    // Subscribe to real-time updates
    subscribeToClients(
        userId: string,
        callback: (clients: Client[]) => void
    ) {
        const q = query(
            collection(db, "clients"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        )

        return onSnapshot(q, (snapshot) => {
            const clients = snapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as Client)
            )
            callback(clients)
        })
    },
}

// ----------------- Product Services -----------------
export const productService = {
    async createProduct(
        userId: string,
        productData: Omit<
            Product,
            "id" | "userId" | "createdAt" | "updatedAt" | "usageCount"
        >
    ): Promise<Product> {
        const newProduct = {
            ...productData,
            userId,
            usageCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }

        const docRef = await addDoc(collection(db, "products"), newProduct)
        return { id: docRef.id, ...newProduct } as Product
    },

    async getProducts(userId: string): Promise<Product[]> {
        const q = query(
            collection(db, "products"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        )

        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Product)
        )
    },

    async updateProduct(
        productId: string,
        updateData: Partial<Product>,
        userId?: string
    ): Promise<Product> {
        const docRef = doc(db, "products", productId)

        // If userId is provided, verify ownership before updating
        if (userId) {
            const docSnap = await getDoc(docRef)
            if (!docSnap.exists()) throw new Error("Product not found")

            const productData = docSnap.data() as Product
            if (productData.userId !== userId) {
                throw new Error("Access denied: Product belongs to another user")
            }
        }

        const updatedData = {
            ...updateData,
            updatedAt: serverTimestamp(),
        }

        await updateDoc(docRef, updatedData)
        return { id: productId, ...updatedData } as Product
    },

    async deleteProduct(productId: string, userId?: string): Promise<string> {
        // If userId is provided, verify ownership before deleting
        if (userId) {
            const docRef = doc(db, "products", productId)
            const docSnap = await getDoc(docRef)
            if (!docSnap.exists()) throw new Error("Product not found")

            const productData = docSnap.data() as Product
            if (productData.userId !== userId) {
                throw new Error("Access denied: Product belongs to another user")
            }
        }

        await deleteDoc(doc(db, "products", productId))
        return productId
    },

    subscribeToProducts(
        userId: string,
        callback: (products: Product[]) => void
    ) {
        const q = query(
            collection(db, "products"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        )

        return onSnapshot(q, (snapshot) => {
            const products = snapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as Product)
            )
            callback(products)
        })
    },
}

// ----------------- Invoice Services -----------------
export const invoiceService = {
    // Generate invoice number
    generateInvoiceNumber(userId: string): string {
        const year = new Date().getFullYear().toString().slice(-2)
        const timestamp = Date.now().toString().slice(-6)
        return `INV-${timestamp}-${year}`
    },

    async createInvoice(
        userId: string,
        invoiceData: Omit<
            Invoice,
            "id" | "userId" | "invoiceNumber" | "createdAt" | "updatedAt"
        >
    ): Promise<Invoice> {
        const invoiceNumber = this.generateInvoiceNumber(userId)

        const newInvoice = {
            ...invoiceData,
            userId,
            invoiceNumber,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }

        const docRef = await addDoc(collection(db, "invoices"), newInvoice)
        return { id: docRef.id, ...newInvoice } as Invoice
    },

    async getInvoices(userId: string): Promise<Invoice[]> {
        const q = query(
            collection(db, "invoices"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        )

        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Invoice)
        )
    },

    async getInvoice(invoiceId: string, userId?: string): Promise<Invoice> {
        const docRef = doc(db, "invoices", invoiceId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) throw new Error("Invoice not found")

        const invoiceData = { id: docSnap.id, ...docSnap.data() } as Invoice

        // If userId is provided, verify ownership
        if (userId && invoiceData.userId !== userId) {
            throw new Error("Access denied: Invoice belongs to another user")
        }

        return invoiceData
    },

    async updateInvoice(
        invoiceId: string,
        updateData: Partial<Invoice>,
        userId?: string
    ): Promise<Invoice> {
        const docRef = doc(db, "invoices", invoiceId)

        // If userId is provided, verify ownership before updating
        if (userId) {
            const docSnap = await getDoc(docRef)
            if (!docSnap.exists()) throw new Error("Invoice not found")

            const invoiceData = docSnap.data() as Invoice
            if (invoiceData.userId !== userId) {
                throw new Error("Access denied: Invoice belongs to another user")
            }
        }

        const updatedData = {
            ...updateData,
            updatedAt: serverTimestamp(),
        }

        await updateDoc(docRef, updatedData)
        return { id: invoiceId, ...updatedData } as Invoice
    },

    async deleteInvoice(invoiceId: string, userId?: string): Promise<string> {
        // If userId is provided, verify ownership before deleting
        if (userId) {
            const docRef = doc(db, "invoices", invoiceId)
            const docSnap = await getDoc(docRef)
            if (!docSnap.exists()) throw new Error("Invoice not found")

            const invoiceData = docSnap.data() as Invoice
            if (invoiceData.userId !== userId) {
                throw new Error("Access denied: Invoice belongs to another user")
            }
        }

        await deleteDoc(doc(db, "invoices", invoiceId))
        return invoiceId
    },

    subscribeToInvoices(
        userId: string,
        callback: (invoices: Invoice[]) => void
    ) {
        const q = query(
            collection(db, "invoices"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        )

        return onSnapshot(q, (snapshot) => {
            const invoices = snapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as Invoice)
            )
            callback(invoices)
        })
    },
}