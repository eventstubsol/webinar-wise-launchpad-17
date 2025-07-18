import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Documentation = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Documentation
            </h1>
            <p className="text-xl text-muted-foreground">
              Comprehensive guides and API references
            </p>
          </div>

          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                We're working hard to bring you comprehensive documentation. 
                Check back soon for detailed guides, API references, and tutorials.
              </p>
              <div className="text-sm text-muted-foreground">
                In the meantime, feel free to reach out to our support team if you have any questions.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Documentation;