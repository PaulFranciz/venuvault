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

export default function AffiliateManager() {
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
    affiliateUserId: "user_id",
    eventId: "event_id",
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
        eventId,
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
        eventId,
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
          {affiliateStats && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Codes</p>
                        <p className="text-2xl font-bold text-gray-900">{affiliateStats.totalCodes}</p>
                      </div>
                      <Link className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Codes</p>
                        <p className="text-2xl font-bold text-gray-900">{affiliateStats.activeCodes}</p>
                      </div>
                      <Target className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Uses</p>
                        <p className="text-2xl font-bold text-gray-900">{affiliateStats.totalUses}</p>
                      </div>
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                        <p className="text-2xl font-bold text-gray-900">${affiliateStats.totalCommission.toFixed(2)}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <Button variant="outline" className="h-20 flex-col">
                      <Share2 className="w-6 h-6 mb-2" />
                      Share Links
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <BarChart3 className="w-6 h-6 mb-2" />
                      View Analytics
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Gift className="w-6 h-6 mb-2" />
                      Create Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <div className="grid gap-4">
            {affiliateStats?.codes.map((code) => (
              <Card key={code._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(code.type || "affiliate")}
                        <Badge className={getTypeColor(code.type || "affiliate")}>
                          {code.type || "affiliate"}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-lg">{code.code}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(code.code)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{code.commissionRate}% commission</span>
                          <span>•</span>
                          <span>{code.currentUses} uses</span>
                          {code.maxUses && (
                            <>
                              <span>•</span>
                              <span>{code.maxUses - code.currentUses} remaining</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        ${code.estimatedEarnings.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">earned</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Valid until {new Date(code.validUntil).toLocaleDateString()}
                      </div>
                      {code.minPurchaseAmount && (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Min. ${code.minPurchaseAmount}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Affiliate Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code Type
                  </label>
                  <Select 
                    value={newCodeData.type} 
                    onValueChange={(value: any) => setNewCodeData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="affiliate">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Affiliate</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="influencer">
                        <div className="flex items-center space-x-2">
                          <Crown className="w-4 h-4" />
                          <span>Influencer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="referral">
                        <div className="flex items-center space-x-2">
                          <UserPlus className="w-4 h-4" />
                          <span>Referral</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Rate (%)
                  </label>
                  <Input
                    type="number"
                    value={newCodeData.commissionRate}
                    onChange={(e) => setNewCodeData(prev => ({ 
                      ...prev, 
                      commissionRate: parseInt(e.target.value) || 0 
                    }))}
                    min="1"
                    max="50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Affiliate Code
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    Generate Code
                  </Button>
                </div>
                <Input
                  value={newCodeData.code}
                  onChange={(e) => setNewCodeData(prev => ({ 
                    ...prev, 
                    code: e.target.value.toUpperCase() 
                  }))}
                  placeholder="Enter custom code or generate one"
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid for (days)
                  </label>
                  <Input
                    type="number"
                    value={newCodeData.validDays}
                    onChange={(e) => setNewCodeData(prev => ({ 
                      ...prev, 
                      validDays: parseInt(e.target.value) || 30 
                    }))}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Uses (Optional)
                  </label>
                  <Input
                    type="number"
                    value={newCodeData.maxUses || ""}
                    onChange={(e) => setNewCodeData(prev => ({ 
                      ...prev, 
                      maxUses: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Purchase ($)
                  </label>
                  <Input
                    type="number"
                    value={newCodeData.minPurchaseAmount || ""}
                    onChange={(e) => setNewCodeData(prev => ({ 
                      ...prev, 
                      minPurchaseAmount: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="No minimum"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Code Preview</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Code:</strong> {newCodeData.code || "YOUR_CODE"}</p>
                  <p><strong>Commission:</strong> {newCodeData.commissionRate}% per sale</p>
                  <p><strong>Type:</strong> {newCodeData.type}</p>
                  <p><strong>Valid for:</strong> {newCodeData.validDays} days</p>
                  {newCodeData.maxUses && <p><strong>Max uses:</strong> {newCodeData.maxUses}</p>}
                  {newCodeData.minPurchaseAmount && <p><strong>Min purchase:</strong> ${newCodeData.minPurchaseAmount}</p>}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline">Save as Draft</Button>
                <Button onClick={handleCreateAffiliateCode} className="bg-blue-600 hover:bg-blue-700">
                  Create Affiliate Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Code Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {affiliateStats?.codes.reduce((acc: any, code) => {
                    const type = code.type || "affiliate";
                    if (!acc[type]) {
                      acc[type] = { uses: 0, earnings: 0, count: 0 };
                    }
                    acc[type].uses += code.currentUses;
                    acc[type].earnings += code.estimatedEarnings;
                    acc[type].count += 1;
                    return acc;
                  }, {}) && Object.entries(affiliateStats.codes.reduce((acc: any, code) => {
                    const type = code.type || "affiliate";
                    if (!acc[type]) {
                      acc[type] = { uses: 0, earnings: 0, count: 0 };
                    }
                    acc[type].uses += code.currentUses;
                    acc[type].earnings += code.estimatedEarnings;
                    acc[type].count += 1;
                    return acc;
                  }, {})).map(([type, stats]: [string, any]) => (
                    <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(type)}
                        <div>
                          <p className="font-medium capitalize">{type}</p>
                          <p className="text-sm text-gray-500">{stats.count} codes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${stats.earnings.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{stats.uses} uses</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {affiliateStats?.codes
                    .sort((a, b) => b.estimatedEarnings - a.estimatedEarnings)
                    .slice(0, 5)
                    .map((code, index) => (
                      <div key={code._id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-mono font-medium">{code.code}</p>
                            <p className="text-sm text-gray-500">{code.currentUses} uses</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            ${code.estimatedEarnings.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {code.commissionRate}% rate
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 