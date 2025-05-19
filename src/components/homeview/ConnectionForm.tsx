
"use client";

import type { FC } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Keep if used by FormLabel
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plug, KeyRound } from 'lucide-react'; // Added KeyRound for token

const formSchema = z.object({
  homeAssistantUrl: z.string().url({ message: "Please enter a valid URL for your Home Assistant instance." }),
  token: z.string().min(1, { message: "Long-Lived Access Token cannot be empty." }),
});

export type ConnectionFormValues = z.infer<typeof formSchema>;

interface ConnectionFormProps {
  onConnect: (values: ConnectionFormValues) => void;
  loading: boolean;
}

const ConnectionForm: FC<ConnectionFormProps> = ({ onConnect, loading }) => {
  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeAssistantUrl: "",
      token: "",
    },
  });

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Plug className="h-6 w-6 text-primary" />
          Connect to Home Assistant
        </CardTitle>
        <CardDescription>
          Enter your Home Assistant instance URL and Long-Lived Access Token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onConnect)} className="space-y-6">
            <FormField
              control={form.control}
              name="homeAssistantUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Assistant URL</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., http://homeassistant.local:8123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <KeyRound className="h-4 w-4" /> Long-Lived Access Token
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your Long-Lived Access Token" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ConnectionForm;
