"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Share2, TrendingUp, Users, Heart, MessageCircle, Repeat2, Eye, Plus, Wand2, Send, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from "sonner";

interface SocialMediaManagerProps {
  eventId: Id<"events">;
}

export default function SocialMediaManager({ eventId }: SocialMediaManagerProps) {
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPlatform, setSelectedPlatform] = useState<"twitter" | "facebook" | "instagram" | "linkedin">("twitter");
  const [contentType, setContentType] = useState<"announcement" | "countdown" | "behind_scenes" | "testimonial" | "early_bird">("announcement");
  const [customContent, setCustomContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Queries
  const socialPosts = useQuery(api.socialMarketing.getSocialPosts, { eventId });
  const socialAnalytics = useQuery(api.socialMarketing.getSocialMediaAnalytics, { eventId });

  // Mutations
  const createSocialPost = useMutation(api.socialMarketing.createSocialPost);
  const generateSocialContent = useMutation(api.socialMarketing.generateSocialContent);

  const handleGenerateContent = async () => {
    try {
      const generated = await generateSocialContent({
        eventId,
        platform: selectedPlatform,
        contentType,
      });
      setCustomContent(generated.content);
      toast.success("Content generated successfully!");
    } catch (error) {
      toast.error("Failed to generate content");
    }
  };

  const handleCreatePost = async () => {
    if (!customContent.trim()) {
      toast.error("Please add content for your post");
      return;
    }

    try {
      let scheduledFor: number | undefined;
      if (scheduledDate && scheduledTime) {
        const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        scheduledFor = dateTime.getTime();
      }

      await createSocialPost({
        eventId,
        platform: selectedPlatform,
        content: customContent,
        scheduledFor,
        createdBy: "current-user", // This should be replaced with actual user ID from Clerk
      });

      setCustomContent("");
      setScheduledDate("");
      setScheduledTime("");
      toast.success("Social media post created!");
    } catch (error) {
      toast.error("Failed to create post");
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      twitter: "🐦",
      facebook: "📘",
      instagram: "📸",
      linkedin: "💼"
    };
    return icons[platform as keyof typeof icons] || "📱";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      scheduled: "bg-blue-100 text-blue-800",
      posted: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Social Media Marketing</h2>
          <p className="text-gray-600">Manage your event's social media presence</p>
        </div>
        <Button onClick={handleCreatePost} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <div className="grid gap-4">
            {socialPosts?.map((post) => (
              <Card key={post._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getPlatformIcon(post.platform)}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium capitalize">{post.platform}</span>
                          <Badge className={getStatusColor(post.status)}>
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {post.engagement && (
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4" />
                          <span>{post.engagement.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Repeat2 className="w-4 h-4" />
                          <span>{post.engagement.shares}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.engagement.comments}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.engagement.clicks}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                  </div>
                  {post.scheduledFor && post.status === "scheduled" && (
                    <div className="mt-3 flex items-center text-sm text-blue-600">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      Scheduled for {new Date(post.scheduledFor).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Social Media Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <Select value={selectedPlatform} onValueChange={(value: any) => setSelectedPlatform(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">🐦 Twitter</SelectItem>
                      <SelectItem value="facebook">📘 Facebook</SelectItem>
                      <SelectItem value="instagram">📸 Instagram</SelectItem>
                      <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type
                  </label>
                  <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">📢 Announcement</SelectItem>
                      <SelectItem value="countdown">⏰ Countdown</SelectItem>
                      <SelectItem value="behind_scenes">🎬 Behind the Scenes</SelectItem>
                      <SelectItem value="testimonial">💬 Testimonial</SelectItem>
                      <SelectItem value="early_bird">🐦 Early Bird</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Content
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateContent}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Wand2 className="w-4 h-4 mr-1" />
                    Generate
                  </Button>
                </div>
                <Textarea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Write your social media post content..."
                  rows={6}
                  className="resize-none"
                />
                <div className="mt-2 text-sm text-gray-500">
                  {customContent.length}/280 characters
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Time (Optional)
                  </label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline">Save as Draft</Button>
                <Button onClick={handleCreatePost} className="bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4 mr-2" />
                  {scheduledDate ? "Schedule Post" : "Post Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {socialAnalytics && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Posts</p>
                        <p className="text-2xl font-bold text-gray-900">{socialAnalytics.totalPosts}</p>
                      </div>
                      <Share2 className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Engagement</p>
                        <p className="text-2xl font-bold text-gray-900">{socialAnalytics.totalEngagement}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg. Engagement</p>
                        <p className="text-2xl font-bold text-gray-900">{Math.round(socialAnalytics.averageEngagement)}</p>
                      </div>
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Platforms</p>
                        <p className="text-2xl font-bold text-gray-900">{Object.keys(socialAnalytics.byPlatform).length}</p>
                      </div>
                      <Share2 className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Posts by Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(socialAnalytics.byPlatform).map(([platform, count]) => (
                        <div key={platform} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getPlatformIcon(platform)}</span>
                            <span className="capitalize">{platform}</span>
                          </div>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {socialAnalytics.topPerformingPosts.slice(0, 3).map((post, index) => (
                        <div key={post._id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">
                              {post.content.substring(0, 50)}...
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>{getPlatformIcon(post.platform)} {post.platform}</span>
                              <span>•</span>
                              <span>{post.engagement?.likes + post.engagement?.shares + post.engagement?.comments} engagements</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {socialPosts?.filter(post => post.status === "scheduled").map((post) => (
                  <div key={post._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getPlatformIcon(post.platform)}</div>
                      <div>
                        <p className="font-medium">{post.platform}</p>
                        <p className="text-sm text-gray-500 truncate max-w-md">
                          {post.content.substring(0, 60)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {post.scheduledFor && new Date(post.scheduledFor).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {post.scheduledFor && new Date(post.scheduledFor).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {socialPosts?.filter(post => post.status === "scheduled").length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No scheduled posts</p>
                    <p className="text-sm">Create a post and schedule it for later</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 