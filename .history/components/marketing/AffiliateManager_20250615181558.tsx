"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Share2, 
  Copy, 
  Plus,
  Eye,
  BarChart3,
  Gift,
  Percent,
  Link,
  UserPlus,
  Crown,
  Target,
  Calendar
} from 'lucide-react';
import { toast } from "sonner";

interface AffiliateManagerProps {
  eventId?: string;
  userId: string;
}

export default function AffiliateManager({ eventId, userId }: AffiliateManagerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newCodeData, setNewCodeData] = useState({
    code: "",
    commissionRate: 10,
    type: "affiliate" as "affiliate" | "influencer" | "referral",
    validDays: 30,
    maxUses: undefined as number | undefined,
    minPurchaseAmount: undefined as number | undefined,
  });

  // Queries
  const affiliateStats = useQuery(api.socialMarketing.getAffiliateStats, {
    affiliateUserId: userId,
    eventId: eventId as any,
  });

  // Mutations
  const createAffiliateCode = useMutation(api.socialMarketing.createAffiliateCode);
  const generatePromoCode = useMutation(api.socialMarketing.generatePromoCode);

  const handleCreateAffiliateCode = async () => {
    if (!newCodeData.code.trim()) {
      toast.error("Please enter a code");
      return;
    }

    try {
      const validFrom = Date.now();
      const validUntil = validFrom + (newCodeData.validDays * 24 * 60 * 60 * 1000);

      await createAffiliateCode({
        eventId: eventId as any,
        affiliateUserId: userId,
        code: newCodeData.code.toUpperCase(),
        commissionRate: newCodeData.commissionRate,
        type: newCodeData.type,
        validFrom,
        validUntil,
        maxUses: newCodeData.maxUses,
        minPurchaseAmount: newCodeData.minPurchaseAmount,
        createdBy: userId,
      });

      setNewCodeData({
        code: "",
        commissionRate: 10,
        type: "affiliate",
        validDays: 30,
        maxUses: undefined,
        minPurchaseAmount: undefined,
      });

      toast.success("Affiliate code created successfully!");
    } catch (error) {
      toast.error("Failed to create affiliate code");
    }
  };

  const handleGenerateCode = async () => {
    try {
      const generated = await generatePromoCode({
        eventId: eventId as any,
        type: "percentage",
        prefix: newCodeData.type.toUpperCase(),
        length: 6,
      });
      setNewCodeData(prev => ({ ...prev, code: generated.code }));
      toast.success("Code generated!");
    } catch (error) {
      toast.error("Failed to generate code");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      affiliate: <Users className="w-4 h-4" />,
      influencer: <Crown className="w-4 h-4" />,
      referral: <UserPlus className="w-4 h-4" />,
    };
    return icons[type as keyof typeof icons] || <Users className="w-4 h-4" />;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      affiliate: "bg-blue-100 text-blue-800",
      influencer: "bg-purple-100 text-purple-800",
      referral: "bg-green-100 text-green-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Affiliate & Referral Program</h2>
          <p className="text-gray-600">Manage your affiliate codes and track earnings</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create New Code
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="codes">My Codes</TabsTrigger>
          <TabsTrigger value="create">Create Code</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Codes</p>
                    <p className="text-2xl font-bold text-gray-900">5</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">$245.50</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="codes">
          <p>Affiliate codes will be listed here</p>
        </TabsContent>

        <TabsContent value="create">
          <p>Create new affiliate code form</p>
        </TabsContent>

        <TabsContent value="analytics">
          <p>Analytics dashboard</p>
        </TabsContent>
      </Tabs>
    </div>
  );
} 