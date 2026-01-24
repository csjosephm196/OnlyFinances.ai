// services/firestoreService.ts - Firestore CRUD operations for all collections

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    UserProfile,
    UserPreferences,
    ConversationDocument,
    ConversationWithId,
    MessageDocument,
    MessageWithId,
    BudgetHistoryDocument,
    BudgetHistoryWithId,
    TransactionDocument,
    BalanceSheetDocument,
    BalanceSheetWithId,
    BalanceSheetItemDocument,
    IncomeStatementDocument,
    IncomeStatementWithId,
    IncomeStatementItemDocument,
} from '../types/firestoreTypes';
import { ProcessingResult, CategorizedTransaction } from '../types/budget';
import { BalanceSheetData, BalanceSheetItem } from '../types/balanceSheet';
import { IncomeStatementData, IncomeStatementItem } from '../types/incomeStatement';

// ============================================
// User Profile Operations
// ============================================

export async function createUserProfile(
    userId: string,
    email: string,
    displayName: string | null = null,
    photoURL: string | null = null
): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const userProfile: UserProfile = {
        email,
        displayName,
        photoURL,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        preferences: {
            theme: 'light',
            currency: 'USD',
            notifications: true,
        },
    };
    await setDoc(userRef, userProfile);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
}

export async function updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        preferences,
        updatedAt: Timestamp.now(),
    });
}

// ============================================
// Conversation Operations
// ============================================

export async function createConversation(
    userId: string,
    title: string,
    sessionId: string | null = null
): Promise<string> {
    const conversationsRef = collection(db, 'conversations');
    const conversationData: ConversationDocument = {
        userId,
        title,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messageCount: 0,
        sessionId,
    };
    const docRef = await addDoc(conversationsRef, conversationData);
    return docRef.id;
}

export async function getConversations(
    userId: string,
    maxCount: number = 50
): Promise<ConversationWithId[]> {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
        conversationsRef,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as ConversationWithId[];
}

export async function updateConversation(
    conversationId: string,
    updates: Partial<Pick<ConversationDocument, 'title' | 'sessionId' | 'messageCount'>>
): Promise<void> {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

export async function deleteConversation(conversationId: string): Promise<void> {
    // Delete all messages in the conversation first
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);

    const batch = writeBatch(db);
    messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete the conversation document
    const conversationRef = doc(db, 'conversations', conversationId);
    batch.delete(conversationRef);

    await batch.commit();
}

// ============================================
// Message Operations
// ============================================

export async function addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    isFinancial?: boolean,
    suggestions?: string[]
): Promise<string> {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageData: MessageDocument = {
        role,
        content,
        timestamp: Timestamp.now(),
        ...(isFinancial !== undefined && { isFinancial }),
        ...(suggestions && { suggestions }),
    };
    const docRef = await addDoc(messagesRef, messageData);

    // Update conversation message count
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (conversationSnap.exists()) {
        const currentCount = conversationSnap.data().messageCount || 0;
        await updateDoc(conversationRef, {
            messageCount: currentCount + 1,
            updatedAt: Timestamp.now(),
        });
    }

    return docRef.id;
}

export async function getMessages(conversationId: string): Promise<MessageWithId[]> {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as MessageWithId[];
}

// ============================================
// Budget History Operations
// ============================================

export async function saveBudgetHistory(
    userId: string,
    fileName: string,
    result: ProcessingResult
): Promise<string> {
    const budgetRef = collection(db, 'budgetHistory');
    const budgetData: BudgetHistoryDocument = {
        userId,
        fileName,
        uploadedAt: Timestamp.now(),
        dateRange: result.date_range,
        totalTransactions: result.total_transactions,
        summary: result.summary,
        monthlyBreakdown: result.monthly_breakdown,
    };
    const docRef = await addDoc(budgetRef, budgetData);

    // Save transactions in subcollection (batch write for efficiency)
    if (result.transactions && result.transactions.length > 0) {
        const transactionsRef = collection(db, 'budgetHistory', docRef.id, 'transactions');
        const batch = writeBatch(db);

        result.transactions.forEach((transaction) => {
            const transactionDoc: TransactionDocument = {
                date: transaction.date,
                description: transaction.description,
                amount: transaction.amount,
                category: transaction.category,
                confidence: transaction.confidence,
                originalCategory: transaction.original_category,
            };
            const newDocRef = doc(transactionsRef);
            batch.set(newDocRef, transactionDoc);
        });

        await batch.commit();
    }

    return docRef.id;
}

export async function getBudgetHistory(
    userId: string,
    maxCount: number = 20
): Promise<BudgetHistoryWithId[]> {
    const budgetRef = collection(db, 'budgetHistory');
    const q = query(
        budgetRef,
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc'),
        limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as BudgetHistoryWithId[];
}

export async function getBudgetTransactions(
    budgetId: string
): Promise<CategorizedTransaction[]> {
    const transactionsRef = collection(db, 'budgetHistory', budgetId, 'transactions');
    const snapshot = await getDocs(transactionsRef);
    return snapshot.docs.map((doc) => {
        const data = doc.data() as TransactionDocument;
        return {
            date: data.date,
            description: data.description,
            amount: data.amount,
            category: data.category,
            confidence: data.confidence,
            original_category: data.originalCategory,
        };
    });
}

export async function deleteBudgetHistory(budgetId: string): Promise<void> {
    // Delete transactions subcollection first
    const transactionsRef = collection(db, 'budgetHistory', budgetId, 'transactions');
    const transactionsSnapshot = await getDocs(transactionsRef);

    const batch = writeBatch(db);
    transactionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete the budget document
    const budgetRef = doc(db, 'budgetHistory', budgetId);
    batch.delete(budgetRef);

    await batch.commit();
}

// ============================================
// Balance Sheet Operations
// ============================================

export async function saveBalanceSheet(
    userId: string,
    fileName: string,
    data: BalanceSheetData
): Promise<string> {
    const balanceRef = collection(db, 'balanceSheets');
    const balanceData: BalanceSheetDocument = {
        userId,
        fileName,
        uploadedAt: Timestamp.now(),
        date: data.date,
        totalItems: data.total_items,
        equity: data.equity,
        assets: {
            total: data.assets.total,
            byCategory: data.assets.by_category,
        },
        liabilities: {
            total: data.liabilities.total,
            byCategory: data.liabilities.by_category,
        },
    };
    const docRef = await addDoc(balanceRef, balanceData);

    // Save items in subcollection
    if (data.items && data.items.length > 0) {
        const itemsRef = collection(db, 'balanceSheets', docRef.id, 'items');
        const batch = writeBatch(db);

        data.items.forEach((item) => {
            const itemDoc: BalanceSheetItemDocument = {
                name: item.name,
                type: item.type,
                category: item.category,
                value: item.value,
                confidence: item.confidence,
            };
            const newDocRef = doc(itemsRef);
            batch.set(newDocRef, itemDoc);
        });

        await batch.commit();
    }

    return docRef.id;
}

export async function getBalanceSheets(
    userId: string,
    maxCount: number = 20
): Promise<BalanceSheetWithId[]> {
    const balanceRef = collection(db, 'balanceSheets');
    const q = query(
        balanceRef,
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc'),
        limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as BalanceSheetWithId[];
}

export async function getBalanceSheetItems(
    balanceSheetId: string
): Promise<BalanceSheetItem[]> {
    const itemsRef = collection(db, 'balanceSheets', balanceSheetId, 'items');
    const snapshot = await getDocs(itemsRef);
    return snapshot.docs.map((doc) => {
        const data = doc.data() as BalanceSheetItemDocument;
        return {
            name: data.name,
            type: data.type,
            category: data.category,
            value: data.value,
            confidence: data.confidence,
        };
    });
}

export async function deleteBalanceSheet(balanceSheetId: string): Promise<void> {
    const itemsRef = collection(db, 'balanceSheets', balanceSheetId, 'items');
    const itemsSnapshot = await getDocs(itemsRef);

    const batch = writeBatch(db);
    itemsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    const balanceRef = doc(db, 'balanceSheets', balanceSheetId);
    batch.delete(balanceRef);

    await batch.commit();
}

// ============================================
// Income Statement Operations
// ============================================

export async function saveIncomeStatement(
    userId: string,
    fileName: string,
    data: IncomeStatementData
): Promise<string> {
    const incomeRef = collection(db, 'incomeStatements');
    const incomeData: IncomeStatementDocument = {
        userId,
        fileName,
        uploadedAt: Timestamp.now(),
        period: data.period,
        totalItems: data.total_items,
        grossProfit: data.gross_profit,
        netIncome: data.net_income,
        revenues: {
            total: data.revenues.total,
            byCategory: data.revenues.by_category,
        },
        expenses: {
            total: data.expenses.total,
            byCategory: data.expenses.by_category,
        },
    };
    const docRef = await addDoc(incomeRef, incomeData);

    // Save items in subcollection
    if (data.items && data.items.length > 0) {
        const itemsRef = collection(db, 'incomeStatements', docRef.id, 'items');
        const batch = writeBatch(db);

        data.items.forEach((item) => {
            const itemDoc: IncomeStatementItemDocument = {
                description: item.description,
                type: item.type,
                category: item.category,
                amount: item.amount,
                confidence: item.confidence,
            };
            const newDocRef = doc(itemsRef);
            batch.set(newDocRef, itemDoc);
        });

        await batch.commit();
    }

    return docRef.id;
}

export async function getIncomeStatements(
    userId: string,
    maxCount: number = 20
): Promise<IncomeStatementWithId[]> {
    const incomeRef = collection(db, 'incomeStatements');
    const q = query(
        incomeRef,
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc'),
        limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as IncomeStatementWithId[];
}

export async function getIncomeStatementItems(
    incomeStatementId: string
): Promise<IncomeStatementItem[]> {
    const itemsRef = collection(db, 'incomeStatements', incomeStatementId, 'items');
    const snapshot = await getDocs(itemsRef);
    return snapshot.docs.map((doc) => {
        const data = doc.data() as IncomeStatementItemDocument;
        return {
            description: data.description,
            type: data.type,
            category: data.category,
            amount: data.amount,
            confidence: data.confidence,
        };
    });
}

export async function deleteIncomeStatement(incomeStatementId: string): Promise<void> {
    const itemsRef = collection(db, 'incomeStatements', incomeStatementId, 'items');
    const itemsSnapshot = await getDocs(itemsRef);

    const batch = writeBatch(db);
    itemsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    const incomeRef = doc(db, 'incomeStatements', incomeStatementId);
    batch.delete(incomeRef);

    await batch.commit();
}

// ============================================
// Data Cleanup Operations (2-year old records)
// ============================================

/**
 * Clean up records older than 2 years for a specific user.
 * Call this on app load or periodically.
 * Returns the count of deleted records.
 */
export async function cleanupOldRecords(userId: string): Promise<{
    conversations: number;
    budgetHistory: number;
    balanceSheets: number;
    incomeStatements: number;
}> {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const cutoffTimestamp = Timestamp.fromDate(twoYearsAgo);

    let conversationsDeleted = 0;
    let budgetHistoryDeleted = 0;
    let balanceSheetsDeleted = 0;
    let incomeStatementsDeleted = 0;

    // Clean up old conversations
    const conversationsRef = collection(db, 'conversations');
    const oldConversationsQuery = query(
        conversationsRef,
        where('userId', '==', userId),
        where('updatedAt', '<', cutoffTimestamp)
    );
    const oldConversations = await getDocs(oldConversationsQuery);
    for (const conversationDoc of oldConversations.docs) {
        await deleteConversation(conversationDoc.id);
        conversationsDeleted++;
    }

    // Clean up old budget history
    const budgetRef = collection(db, 'budgetHistory');
    const oldBudgetQuery = query(
        budgetRef,
        where('userId', '==', userId),
        where('uploadedAt', '<', cutoffTimestamp)
    );
    const oldBudgets = await getDocs(oldBudgetQuery);
    for (const budgetDoc of oldBudgets.docs) {
        await deleteBudgetHistory(budgetDoc.id);
        budgetHistoryDeleted++;
    }

    // Clean up old balance sheets
    const balanceRef = collection(db, 'balanceSheets');
    const oldBalanceQuery = query(
        balanceRef,
        where('userId', '==', userId),
        where('uploadedAt', '<', cutoffTimestamp)
    );
    const oldBalanceSheets = await getDocs(oldBalanceQuery);
    for (const balanceDoc of oldBalanceSheets.docs) {
        await deleteBalanceSheet(balanceDoc.id);
        balanceSheetsDeleted++;
    }

    // Clean up old income statements
    const incomeRef = collection(db, 'incomeStatements');
    const oldIncomeQuery = query(
        incomeRef,
        where('userId', '==', userId),
        where('uploadedAt', '<', cutoffTimestamp)
    );
    const oldIncomeStatements = await getDocs(oldIncomeQuery);
    for (const incomeDoc of oldIncomeStatements.docs) {
        await deleteIncomeStatement(incomeDoc.id);
        incomeStatementsDeleted++;
    }

    console.log(`Cleanup complete: ${conversationsDeleted} conversations, ${budgetHistoryDeleted} budgets, ${balanceSheetsDeleted} balance sheets, ${incomeStatementsDeleted} income statements deleted.`);

    return {
        conversations: conversationsDeleted,
        budgetHistory: budgetHistoryDeleted,
        balanceSheets: balanceSheetsDeleted,
        incomeStatements: incomeStatementsDeleted,
    };
}
