'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import { H1, P } from '@/components/ui/typography';
import { Container } from '@/components/ui/container';
import { Flex } from '@/components/ui/flex';
import SourceDistribution from '@/components/outreach/SourceDistribution';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

export default function OutreachPage() {
  return (
    <DashboardLayout>
      <Container>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants}>
            <Flex direction="row" justify="between" align="center" className="mb-6">
              <div>
                <H1 className="text-gray-900">Outreach</H1>
                <P className="text-gray-700">Manage your outreach campaigns and message templates</P>
              </div>
            </Flex>
          </motion.div>

          <motion.div variants={itemVariants}>
            <SourceDistribution />
          </motion.div>
        </motion.div>
      </Container>
    </DashboardLayout>
  );
} 