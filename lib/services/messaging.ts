import { databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
import { MESSAGE_TYPES } from '@/lib/constants';

export interface Conversation {
  $id: string;
  conversationId: string;
  participants: string[];
  productId?: string;
  orderId?: string;
  type: string;
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: string;
    messageType: string;
  };
  unreadCount: Record<string, number>;
  status: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface Message {
  $id: string;
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  attachments: string[];
  readBy: Record<string, string>;
  editedAt?: string;
  deletedAt?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateConversationData {
  participants: string[];
  productId?: string;
  orderId?: string;
  type?: string;
  initialMessage?: {
    senderId: string;
    content: string;
    messageType?: string;
  };
}

export interface CreateMessageData {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: string;
  attachments?: string[];
}

export interface ConversationFilters {
  userId: string;
  type?: string;
  productId?: string;
  orderId?: string;
  status?: string;
  hasUnread?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'unread_first';
}

export interface MessageFilters {
  conversationId: string;
  senderId?: string;
  messageType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest';
}

export class MessagingService {
  private static readonly CONVERSATIONS_COLLECTION = 'conversations';
  private static readonly MESSAGES_COLLECTION = 'messages';

  /**
   * Create a new conversation
   */
  static async createConversation(conversationData: CreateConversationData): Promise<Conversation> {
    try {
      console.log('🔄 Creating conversation...');

      // Validate participants
      if (conversationData.participants.length < 2) {
        throw new Error('Conversation must have at least 2 participants');
      }

      // Check if conversation already exists for these participants and context
      const existingConversations = await this.findExistingConversation(
        conversationData.participants,
        conversationData.productId,
        conversationData.orderId
      );

      if (existingConversations.length > 0) {
        console.log('✅ Using existing conversation:', existingConversations[0].$id);
        return existingConversations[0];
      }

      // Prepare conversation document
      const conversationDocument = {
        conversationId: ID.unique(),
        participants: JSON.stringify(conversationData.participants),
        productId: conversationData.productId || '',
        orderId: conversationData.orderId || '',
        type: conversationData.type || 'general',
        lastMessage: '',
        unreadCount: JSON.stringify(
          conversationData.participants.reduce((acc, participantId) => {
            acc[participantId] = 0;
            return acc;
          }, {} as Record<string, number>)
        ),
        status: 'active'
      };

      // Create conversation
      const conversation = await databases.createDocument(
        DATABASE_ID,
        this.CONVERSATIONS_COLLECTION,
        conversationDocument,
        ID.unique()
      );

      console.log('✅ Conversation created successfully:', conversation.$id);

      const createdConversation = this.transformConversation(conversation);

      // Send initial message if provided
      if (conversationData.initialMessage) {
        await this.sendMessage({
          conversationId: createdConversation.$id,
          senderId: conversationData.initialMessage.senderId,
          content: conversationData.initialMessage.content,
          messageType: conversationData.initialMessage.messageType || MESSAGE_TYPES.TEXT
        });
      }

      return createdConversation;

    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create conversation');
    }
  }

  /**
   * Get conversations for a user
   */
  static async getConversations(filters: ConversationFilters): Promise<{
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log('🔄 Fetching conversations for user:', filters.userId);

      const queries: string[] = [];

      // User must be a participant
      queries.push(Query.search('participants', filters.userId));

      // Type filter
      if (filters.type) {
        queries.push(Query.equal('type', filters.type));
      }

      // Product filter
      if (filters.productId) {
        queries.push(Query.equal('productId', filters.productId));
      }

      // Order filter
      if (filters.orderId) {
        queries.push(Query.equal('orderId', filters.orderId));
      }

      // Status filter
      if (filters.status) {
        queries.push(Query.equal('status', filters.status));
      } else {
        queries.push(Query.equal('status', 'active'));
      }

      // Sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'newest':
            queries.push(Query.orderDesc('$updatedAt'));
            break;
          case 'oldest':
            queries.push(Query.orderAsc('$updatedAt'));
            break;
          case 'unread_first':
            // This would need a more complex query implementation
            queries.push(Query.orderDesc('$updatedAt'));
            break;
          default:
            queries.push(Query.orderDesc('$updatedAt'));
        }
      } else {
        queries.push(Query.orderDesc('$updatedAt'));
      }

      // Pagination
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;

      queries.push(Query.limit(limit));
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      // Fetch conversations
      const response = await databases.listDocuments(
        DATABASE_ID,
        this.CONVERSATIONS_COLLECTION,
        queries,
        true
      );

      let conversations = response.documents.map(this.transformConversation);

      // Filter by unread status if specified (post-query filtering)
      if (filters.hasUnread !== undefined) {
        conversations = conversations.filter(conversation => {
          const userUnreadCount = conversation.unreadCount[filters.userId] || 0;
          return filters.hasUnread ? userUnreadCount > 0 : userUnreadCount === 0;
        });
      }

      const hasMore = response.total > offset + conversations.length;

      console.log(`✅ Retrieved ${conversations.length} conversations`);

      return {
        conversations,
        total: response.total,
        hasMore
      };

    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      throw new Error('Failed to fetch conversations');
    }
  }

  /**
   * Get messages in a conversation
   */
  static async getMessages(filters: MessageFilters): Promise<{
    messages: Message[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log('🔄 Fetching messages for conversation:', filters.conversationId);

      const queries: string[] = [];

      // Conversation filter
      queries.push(Query.equal('conversationId', filters.conversationId));

      // Exclude deleted messages
      queries.push(Query.isNull('deletedAt'));

      // Sender filter
      if (filters.senderId) {
        queries.push(Query.equal('senderId', filters.senderId));
      }

      // Message type filter
      if (filters.messageType) {
        queries.push(Query.equal('messageType', filters.messageType));
      }

      // Date range filters
      if (filters.dateFrom) {
        queries.push(Query.greaterThanEqual('$createdAt', filters.dateFrom));
      }

      if (filters.dateTo) {
        queries.push(Query.lessThanEqual('$createdAt', filters.dateTo));
      }

      // Sorting
      if (filters.sortBy === 'oldest') {
        queries.push(Query.orderAsc('$createdAt'));
      } else {
        queries.push(Query.orderDesc('$createdAt'));
      }

      // Pagination
      const limit = Math.min(filters.limit || 50, 200);
      const offset = filters.offset || 0;

      queries.push(Query.limit(limit));
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      // Fetch messages
      const response = await databases.listDocuments(
        DATABASE_ID,
        this.MESSAGES_COLLECTION,
        queries,
        true
      );

      const messages = response.documents.map(this.transformMessage);
      const hasMore = response.total > offset + messages.length;

      console.log(`✅ Retrieved ${messages.length} messages`);

      return {
        messages,
        total: response.total,
        hasMore
      };

    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  /**
   * Send a message
   */
  static async sendMessage(messageData: CreateMessageData): Promise<Message> {
    try {
      console.log('🔄 Sending message...');

      // Validate conversation exists
      const conversation = await databases.getDocument(
        DATABASE_ID,
        this.CONVERSATIONS_COLLECTION,
        messageData.conversationId
      );

      const participants = JSON.parse(conversation.participants);

      // Verify sender is a participant
      if (!participants.includes(messageData.senderId)) {
        throw new Error('Sender is not a participant in this conversation');
      }

      // Prepare message document
      const messageDocument = {
        messageId: ID.unique(),
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        content: messageData.content.trim(),
        messageType: messageData.messageType || MESSAGE_TYPES.TEXT,
        attachments: JSON.stringify(messageData.attachments || []),
        readBy: JSON.stringify({
          [messageData.senderId]: new Date().toISOString()
        }),
        editedAt: '',
        deletedAt: ''
      };

      // Create message
      const message = await databases.createDocument(
        DATABASE_ID,
        this.MESSAGES_COLLECTION,
        messageDocument,
        ID.unique()
      );

      // Update conversation with last message and unread counts
      await this.updateConversationLastMessage(
        messageData.conversationId,
        message,
        participants,
        messageData.senderId
      );

      console.log('✅ Message sent successfully:', message.$id);
      return this.transformMessage(message);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send message');
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(
    conversationId: string,
    userId: string,
    messageIds?: string[]
  ): Promise<void> {
    try {
      console.log('🔄 Marking messages as read...');

      let messagesToUpdate: any[];

      if (messageIds) {
        // Mark specific messages as read
        const messagePromises = messageIds.map(messageId =>
          databases.getDocument(
            DATABASE_ID,
            this.MESSAGES_COLLECTION,
            messageId
          )
        );
        messagesToUpdate = await Promise.all(messagePromises);
      } else {
        // Mark all unread messages in conversation as read
        const messagesResponse = await databases.listDocuments(
        DATABASE_ID,
          this.MESSAGES_COLLECTION,
          [
            Query.equal('conversationId', conversationId),
            Query.isNull('deletedAt')
          ]
        );
        messagesToUpdate = messagesResponse.documents;
      }

      // Update read status for each message
      const updatePromises = messagesToUpdate.map(async (message) => {
        const readBy = message.readBy ? JSON.parse(message.readBy) : {};
        
        // Skip if already read by this user
        if (readBy[userId]) {
          return;
        }

        readBy[userId] = new Date().toISOString();

        return databases.updateDocument(
          DATABASE_ID,
          this.MESSAGES_COLLECTION,
          message.$id,
          {
            readBy: JSON.stringify(readBy),
            $updatedAt: new Date().toISOString()
          }
        );
      });

      await Promise.all(updatePromises);

      // Reset unread count for this user in conversation
      await this.updateConversationUnreadCount(conversationId, userId, 0);

      console.log('✅ Messages marked as read');

    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }

  /**
   * Edit a message
   */
  static async editMessage(
    messageId: string,
    senderId: string,
    newContent: string
  ): Promise<Message> {
    try {
      console.log('🔄 Editing message...');

      const message = await databases.getDocument(
        DATABASE_ID,
        this.MESSAGES_COLLECTION,
        messageId
      );

      // Verify sender owns the message
      if (message.senderId !== senderId) {
        throw new Error('You can only edit your own messages');
      }

      // Check if message was already deleted
      if (message.deletedAt) {
        throw new Error('Cannot edit deleted message');
      }

      const updatedMessage = await databases.updateDocument(
        DATABASE_ID,
        this.MESSAGES_COLLECTION,
        messageId,
        {
          content: newContent.trim(),
          editedAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        }
      );

      console.log('✅ Message edited successfully:', updatedMessage.$id);
      return this.transformMessage(updatedMessage);

    } catch (error) {
      console.error('❌ Error editing message:', error);
      throw new Error('Failed to edit message');
    }
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId: string, senderId: string): Promise<void> {
    try {
      console.log('🔄 Deleting message...');

      const message = await databases.getDocument(
        DATABASE_ID,
        this.MESSAGES_COLLECTION,
        messageId
      );

      // Verify sender owns the message
      if (message.senderId !== senderId) {
        throw new Error('You can only delete your own messages');
      }

      // Soft delete the message
      await databases.updateDocument(
        DATABASE_ID,
        this.MESSAGES_COLLECTION,
        messageId,
        {
          deletedAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        }
      );

      console.log('✅ Message deleted successfully:', messageId);

    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  /**
   * Subscribe to real-time conversation updates
   */
  static subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void,
    onUpdate?: (conversation: Conversation) => void
  ): () => void {
    console.log('🔄 Setting up real-time subscription for conversation:', conversationId);

    // Subscribe to new messages
    const messagesUnsubscribe = appwriteMCP.subscribe(
      `databases.${DATABASE_ID}.collections.${this.MESSAGES_COLLECTION}.documents`,
      (response: any) => {
        if (response.payload.conversationId === conversationId && response.event.includes('create')) {
          const message = this.transformMessage(response.payload);
          onMessage(message);
        }
      }
    );

    // Subscribe to conversation updates (optional)
    let conversationUnsubscribe: (() => void) | null = null;
    if (onUpdate) {
      conversationUnsubscribe = appwriteMCP.subscribe(
        `databases.${DATABASE_ID}.collections.${this.CONVERSATIONS_COLLECTION}.documents.${conversationId}`,
        (response: any) => {
          if (response.event.includes('update')) {
            const conversation = this.transformConversation(response.payload);
            onUpdate(conversation);
          }
        }
      );
    }

    // Return cleanup function
    return () => {
      messagesUnsubscribe();
      if (conversationUnsubscribe) {
        conversationUnsubscribe();
      }
    };
  }

  /**
   * Find existing conversation between participants
   */
  private static async findExistingConversation(
    participants: string[],
    productId?: string,
    orderId?: string
  ): Promise<Conversation[]> {
    try {
      const queries: string[] = [];

      // Search for conversations containing all participants
      participants.forEach(participantId => {
        queries.push(Query.search('participants', participantId));
      });

      if (productId) {
        queries.push(Query.equal('productId', productId));
      }

      if (orderId) {
        queries.push(Query.equal('orderId', orderId));
      }

      queries.push(Query.equal('status', 'active'));

      const response = await databases.listDocuments(
        DATABASE_ID,
        this.CONVERSATIONS_COLLECTION,
        queries
      );

      // Filter to exact participant matches (since search might return partial matches)
      const exactMatches = response.documents.filter(doc => {
        const docParticipants = JSON.parse(doc.participants);
        return participants.length === docParticipants.length &&
               participants.every(p => docParticipants.includes(p));
      });

      return exactMatches.map(this.transformConversation);

    } catch (error) {
      console.error('❌ Error finding existing conversation:', error);
      return [];
    }
  }

  /**
   * Update conversation with last message and unread counts
   */
  private static async updateConversationLastMessage(
    conversationId: string,
    message: any,
    participants: string[],
    senderId: string
  ): Promise<void> {
    try {
      const conversation = await databases.getDocument(
        DATABASE_ID,
        this.CONVERSATIONS_COLLECTION,
        conversationId
      );

      const currentUnreadCount = JSON.parse(conversation.unreadCount || '{}');

      // Increment unread count for all participants except sender
      participants.forEach(participantId => {
        if (participantId !== senderId) {
          currentUnreadCount[participantId] = (currentUnreadCount[participantId] || 0) + 1;
        }
      });

      const lastMessage = {
        content: message.content,
        senderId: message.senderId,
        timestamp: message.$createdAt,
        messageType: message.messageType
      };

      await databases.updateDocument(
        DATABASE_ID,
        this.CONVERSATIONS_COLLECTION,
        conversationId,
        {
          lastMessage: JSON.stringify(lastMessage),
          unreadCount: JSON.stringify(currentUnreadCount),
          $updatedAt: new Date().toISOString()
        }
      );

    } catch (error) {
      console.error('❌ Error updating conversation last message:', error);
    }
  }

  /**
   * Update unread count for a specific user in conversation
   */
  private static async updateConversationUnreadCount(
    conversationId: string,
    userId: string,
    count: number
  ): Promise<void> {
    try {
      const conversation = await databases.getDocument(
        DATABASE_ID,
        this.CONVERSATIONS_COLLECTION,
        conversationId
      );

      const unreadCount = JSON.parse(conversation.unreadCount || '{}');
      unreadCount[userId] = count;

      await databases.updateDocument(
        DATABASE_ID,
        this.CONVERSATIONS_COLLECTION,
        conversationId,
        {
          unreadCount: JSON.stringify(unreadCount),
          $updatedAt: new Date().toISOString()
        }
      );

    } catch (error) {
      console.error('❌ Error updating conversation unread count:', error);
    }
  }

  /**
   * Transform database document to Conversation interface
   */
  private static transformConversation(doc: any): Conversation {
    return {
      $id: doc.$id,
      conversationId: doc.conversationId,
      participants: doc.participants ? JSON.parse(doc.participants) : [],
      productId: doc.productId || undefined,
      orderId: doc.orderId || undefined,
      type: doc.type,
      lastMessage: doc.lastMessage ? JSON.parse(doc.lastMessage) : undefined,
      unreadCount: doc.unreadCount ? JSON.parse(doc.unreadCount) : {},
      status: doc.status,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }

  /**
   * Transform database document to Message interface
   */
  private static transformMessage(doc: any): Message {
    return {
      $id: doc.$id,
      messageId: doc.messageId,
      conversationId: doc.conversationId,
      senderId: doc.senderId,
      content: doc.content,
      messageType: doc.messageType,
      attachments: doc.attachments ? JSON.parse(doc.attachments) : [],
      readBy: doc.readBy ? JSON.parse(doc.readBy) : {},
      editedAt: doc.editedAt || undefined,
      deletedAt: doc.deletedAt || undefined,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }
}

export default MessagingService;