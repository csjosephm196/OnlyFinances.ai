// Firestore utility functions for OnlyFinances.ai
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    DocumentData
} from "firebase/firestore";
import { db } from "./firebase";

// Collection names
export const COLLECTIONS = {
    TRANSACTIONS: "transactions",
    CATEGORIES: "categories",
    BUDGETS: "budgets",
    USERS: "users"
} as const;

// Transaction interface
export interface Transaction {
    id?: string;
    userId: string;
    date: Date | Timestamp;
    description: string;
    amount: number;
    category: string;
    layer1Category?: string;
    layer2Category?: string;
    confidence?: number;
    createdAt: Date | Timestamp;
}

// Add a transaction
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
        ...transaction,
        createdAt: Timestamp.now()
    });
    return docRef.id;
}

// Get all transactions for a user
export async function getUserTransactions(userId: string): Promise<Transaction[]> {
    const q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where("userId", "==", userId),
        orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Transaction));
}

// Get transactions by date range
export async function getTransactionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
): Promise<Transaction[]> {
    const q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where("userId", "==", userId),
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate)),
        orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Transaction));
}

// Update a transaction
export async function updateTransaction(id: string, data: Partial<Transaction>) {
    const docRef = doc(db, COLLECTIONS.TRANSACTIONS, id);
    await updateDoc(docRef, data as DocumentData);
}

// Delete a transaction
export async function deleteTransaction(id: string) {
    const docRef = doc(db, COLLECTIONS.TRANSACTIONS, id);
    await deleteDoc(docRef);
}

// Batch add transactions (for CSV imports)
export async function batchAddTransactions(
    userId: string,
    transactions: Omit<Transaction, 'id' | 'userId' | 'createdAt'>[]
) {
    const promises = transactions.map(transaction =>
        addTransaction({ ...transaction, userId })
    );
    return Promise.all(promises);
}

// Get spending by category
export async function getSpendingByCategory(userId: string): Promise<Record<string, number>> {
    const transactions = await getUserTransactions(userId);

    return transactions.reduce((acc, transaction) => {
        const category = transaction.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Math.abs(transaction.amount);
        return acc;
    }, {} as Record<string, number>);
}
