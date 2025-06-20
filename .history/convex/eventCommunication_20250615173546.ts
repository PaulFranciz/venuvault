import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Event Announcements
export const createAnnouncement = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("schedule_change"),
      v.literal("venue_change"),
      v.literal("cancellation"),
      v.literal("important")
    ),
    createdBy: v.string(),
    sendEmail: v.boolean(),
    sendPush: v.optional(v.boolean()),
    targetAudience: v.union(
      v.literal("all_attendees"),
      v.literal("ticket_holders"),
      v.literal("waitlist")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const announcementId = await ctx.db.insert("eventAnnouncements", {
      ...args,
      isPublished: true,
      createdAt: now,
      publishedAt: now,
    });

    // If email should be sent, trigger email campaign
    if (args.sendEmail) {
      // This would trigger an automated email campaign
      // Integration with your email automation system
    }

    return announcementId;
  },
});

export const getEventAnnouncements = query({
  args: {
    eventId: v.id("events"),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, { eventId, isPublished = true }) => {
    let query = ctx.db
      .query("eventAnnouncements")
      .withIndex("by_event", (q) => q.eq("eventId", eventId));

    if (isPublished !== undefined) {
      query = query.filter((q) => q.eq(q.field("isPublished"), isPublished));
    }

    const announcements = await query.order("desc").collect();
    
    // Get creator info for each announcement
    const announcementsWithCreator = await Promise.all(
      announcements.map(async (announcement) => {
        const creator = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", announcement.createdBy))
          .first();
        
        return {
          ...announcement,
          creator: creator ? { name: creator.name, email: creator.email } : null,
        };
      })
    );

    return announcementsWithCreator;
  },
});

// Event Q&A System
export const askQuestion = mutation({
  args: {
    eventId: v.id("events"),
    question: v.string(),
    askedBy: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const questionId = await ctx.db.insert("eventQA", {
      ...args,
      isAnswered: false,
      upvotes: 0,
      createdAt: Date.now(),
    });

    return questionId;
  },
});

export const answerQuestion = mutation({
  args: {
    questionId: v.id("eventQA"),
    answer: v.string(),
    answeredBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.questionId, {
      answer: args.answer,
      answeredBy: args.answeredBy,
      isAnswered: true,
      answeredAt: Date.now(),
    });

    return args.questionId;
  },
});

export const upvoteQuestion = mutation({
  args: {
    questionId: v.id("eventQA"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error("Question not found");

    await ctx.db.patch(args.questionId, {
      upvotes: question.upvotes + 1,
    });

    return question.upvotes + 1;
  },
});

export const getEventQuestions = query({
  args: {
    eventId: v.id("events"),
    isPublic: v.optional(v.boolean()),
    isAnswered: v.optional(v.boolean()),
  },
  handler: async (ctx, { eventId, isPublic, isAnswered }) => {
    let query = ctx.db
      .query("eventQA")
      .withIndex("by_event", (q) => q.eq("eventId", eventId));

    let questions = await query.collect();

    // Apply filters
    if (isPublic !== undefined) {
      questions = questions.filter(q => q.isPublic === isPublic);
    }
    
    if (isAnswered !== undefined) {
      questions = questions.filter(q => q.isAnswered === isAnswered);
    }

    // Get user info for each question
    const questionsWithUsers = await Promise.all(
      questions.map(async (question) => {
        const asker = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", question.askedBy))
          .first();
        
        let answerer = null;
        if (question.answeredBy) {
          answerer = await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) => q.eq("userId", question.answeredBy))
            .first();
        }

        return {
          ...question,
          asker: asker ? { name: asker.name, email: asker.email } : null,
          answerer: answerer ? { name: answerer.name, email: answerer.email } : null,
        };
      })
    );

    // Sort by upvotes (descending) then by creation date
    return questionsWithUsers.sort((a, b) => {
      if (a.upvotes !== b.upvotes) {
        return b.upvotes - a.upvotes;
      }
      return b.createdAt - a.createdAt;
    });
  },
});

// Attendee Networking
export const sendConnectionRequest = mutation({
  args: {
    eventId: v.id("events"),
    targetUserId: v.string(),
    requesterUserId: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists
    const existing = await ctx.db
      .query("networkingConnections")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => 
        q.and(
          q.eq(q.field("requesterUserId"), args.requesterUserId),
          q.eq(q.field("targetUserId"), args.targetUserId)
        )
      )
      .first();

    if (existing) {
      throw new Error("Connection request already exists");
    }

    const connectionId = await ctx.db.insert("networkingConnections", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });

    return connectionId;
  },
});

export const respondToConnectionRequest = mutation({
  args: {
    connectionId: v.id("networkingConnections"),
    status: v.union(v.literal("accepted"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      status: args.status,
      respondedAt: Date.now(),
    });

    return args.connectionId;
  },
});

export const getNetworkingConnections = query({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    )),
  },
  handler: async (ctx, { eventId, userId, status }) => {
    let query = ctx.db
      .query("networkingConnections")
      .withIndex("by_event", (q) => q.eq("eventId", eventId));

    let connections = await query.collect();

    // Filter by user (either requester or target)
    connections = connections.filter(c => 
      c.requesterUserId === userId || c.targetUserId === userId
    );

    // Filter by status if provided
    if (status) {
      connections = connections.filter(c => c.status === status);
    }

    // Get user info for each connection
    const connectionsWithUsers = await Promise.all(
      connections.map(async (connection) => {
        const requester = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", connection.requesterUserId))
          .first();
        
        const target = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", connection.targetUserId))
          .first();

        return {
          ...connection,
          requester: requester ? {
            name: requester.name,
            email: requester.email,
            networkingProfile: requester.networkingProfile,
          } : null,
          target: target ? {
            name: target.name,
            email: target.email,
            networkingProfile: target.networkingProfile,
          } : null,
        };
      })
    );

    return connectionsWithUsers;
  },
});

export const getEventAttendees = query({
  args: {
    eventId: v.id("events"),
    includeNetworkingProfiles: v.optional(v.boolean()),
  },
  handler: async (ctx, { eventId, includeNetworkingProfiles = false }) => {
    // Get all ticket holders for the event
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) => q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used")))
      .collect();

    // Get unique user IDs
    const userIds = [...new Set(tickets.map(t => t.userId))];

    // Get user info for each attendee
    const attendees = await Promise.all(
      userIds.map(async (userId) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .first();

        if (!user) return null;

        const userTickets = tickets.filter(t => t.userId === userId);

        return {
          userId: user.userId,
          name: user.name,
          email: user.email,
          ticketCount: userTickets.length,
          networkingProfile: includeNetworkingProfiles && user.networkingProfile?.isPublic 
            ? user.networkingProfile 
            : null,
        };
      })
    );

    return attendees.filter(Boolean);
  },
});

// Meeting Scheduling
export const scheduleMeeting = mutation({
  args: {
    eventId: v.id("events"),
    organizerUserId: v.string(),
    attendeeUserId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledTime: v.number(),
    duration: v.number(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meetingId = await ctx.db.insert("meetingSchedules", {
      ...args,
      status: "scheduled",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return meetingId;
  },
});

export const updateMeetingStatus = mutation({
  args: {
    meetingId: v.id("meetingSchedules"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.meetingId;
  },
});

export const getUserMeetings = query({
  args: {
    userId: v.string(),
    eventId: v.optional(v.id("events")),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")
    )),
  },
  handler: async (ctx, { userId, eventId, status }) => {
    let query = ctx.db.query("meetingSchedules");

    // Filter by user (either organizer or attendee)
    let meetings = await query.collect();
    meetings = meetings.filter(m => 
      m.organizerUserId === userId || m.attendeeUserId === userId
    );

    // Filter by event if provided
    if (eventId) {
      meetings = meetings.filter(m => m.eventId === eventId);
    }

    // Filter by status if provided
    if (status) {
      meetings = meetings.filter(m => m.status === status);
    }

    // Get user info for each meeting
    const meetingsWithUsers = await Promise.all(
      meetings.map(async (meeting) => {
        const organizer = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", meeting.organizerUserId))
          .first();
        
        const attendee = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", meeting.attendeeUserId))
          .first();

        const event = await ctx.db.get(meeting.eventId);

        return {
          ...meeting,
          organizer: organizer ? { name: organizer.name, email: organizer.email } : null,
          attendee: attendee ? { name: attendee.name, email: attendee.email } : null,
          event: event ? { name: event.name, eventDate: event.eventDate } : null,
        };
      })
    );

    return meetingsWithUsers.sort((a, b) => a.scheduledTime - b.scheduledTime);
  },
});

// User Profile Management
export const updateNetworkingProfile = mutation({
  args: {
    userId: v.string(),
    networkingProfile: v.object({
      bio: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
      company: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      linkedIn: v.optional(v.string()),
      twitter: v.optional(v.string()),
      website: v.optional(v.string()),
      isPublic: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      networkingProfile: args.networkingProfile,
    });

    return user._id;
  },
});

export const updateEmailPreferences = mutation({
  args: {
    userId: v.string(),
    emailPreferences: v.object({
      marketing: v.boolean(),
      eventReminders: v.boolean(),
      eventUpdates: v.boolean(),
      networking: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      emailPreferences: args.emailPreferences,
    });

    return user._id;
  },
});

export const getUserProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      return null;
    }

    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      networkingProfile: user.networkingProfile,
      emailPreferences: user.emailPreferences,
    };
  },
}); 