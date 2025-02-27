import React from 'react';
import { Card, Flex, Text } from '@radix-ui/themes';
import { OffenseReportItem } from '../models/game-state.model';

interface MiniOffenseCardProps {
  offenseReport: OffenseReportItem;
}

const MiniOffenseCard: React.FC<MiniOffenseCardProps> = ({ offenseReport }) => {
  return (
    <Card className="mini-offense p-2 mx-2 max-w-[250px] min-w-[250px]">
      <Flex direction="column" gap="1">
        <Flex align="center" gap="1">
          <Text size="1" weight="bold">
            {offenseReport.location}
          </Text>
          <Text size="1" color="gray">
            {offenseReport.time}
          </Text>
        </Flex>
        <Text size="1" className="line-clamp-2">
          {offenseReport.description}
        </Text>
      </Flex>
    </Card>
  );
};

export default MiniOffenseCard; 