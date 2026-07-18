import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";

export default function AddCard() {
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    cvv: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardData({
      ...cardData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save card here
    console.log(cardData);

    alert("Card Added Successfully!");

    setCardData({
      cardNumber: "",
      cardHolder: "",
      expiry: "",
      cvv: "",
    });
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Add Credit / Debit Card
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Card Number</Label>
              <Input
                name="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardData.cardNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>Card Holder Name</Label>
              <Input
                name="cardHolder"
                placeholder="John Doe"
                value={cardData.cardHolder}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry</Label>
                <Input
                  name="expiry"
                  placeholder="MM/YY"
                  value={cardData.expiry}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label>CVV</Label>
                <Input
                  name="cvv"
                  placeholder="123"
                  type="password"
                  maxLength={3}
                  value={cardData.cvv}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <Button className="w-full" type="submit">
              Save Card
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}