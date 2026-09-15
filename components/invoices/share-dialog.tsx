"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

interface ShareInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
}

interface ShareDialogProps {
  invoice: ShareInvoice | null;
  currency: string;
  onClose: () => void;
}

export function ShareDialog({ invoice, currency, onClose }: ShareDialogProps) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = invoice && origin ? `${origin}/i/${invoice.id}` : "";
  const message = invoice
    ? `Invoice ${invoice.invoiceNumber} — ${formatCurrency(invoice.totalAmount, currency)}. View & pay: ${url}`
    : "";

  function copyLink() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share invoice</DialogTitle>
          <DialogDescription>
            Send a payment link to your customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {message && (
            <>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-600"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={`sms:?body=${encodeURIComponent(message)}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600"
              >
                <Smartphone className="h-4 w-4" />
                SMS
              </a>
            </>
          )}

          <Button variant="outline" className="w-full" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy link
          </Button>

          {url && (
            <p className="break-all text-center text-xs text-muted-foreground">
              {url}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
