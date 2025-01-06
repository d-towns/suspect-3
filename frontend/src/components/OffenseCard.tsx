import { Card, Flex, Inset, Text } from "@radix-ui/themes";
import { OffenseReportItem } from "../models";
import AnimatedText from "./animatedText";

interface OffenseReportCardProps {
    offenseReport: OffenseReportItem;
    handleNext?: () => void;
    size?: 'small' | 'large' | 'mini' | 'xl'
    index?: number;
}

export const OffenseReportCard: React.FC<OffenseReportCardProps> = ({ offenseReport, handleNext, size, index }) => {
    function calculateWidth() {
        switch (size) {
            case 'small':
                return '300px'
            case 'large':
                return '700px'
            case 'mini':
                return '200px'
            default:
                return '400px'
        }

    }

    const sampleImage = [
        '/backdoor.webp',
        '/thief-stealing.webp',
        '/multi-player-splash.webp'
    ]
    const width = calculateWidth();

    if (size === 'xl') {
        return (
            <Card className="p-8 offenseReport flex h-full" style={{ width: '1400px' }} onClick={handleNext}>
                <Flex direction={'column'} className='w-full'>
                    <Flex className='w-full'>
                        <img
                            src={offenseReport.imgSrc || sampleImage[index || 0]}
                            className="block object-cover w-full max-h-[800px] bg-gray-200 rounded"
                        />

                        <Flex direction='column' gap='9' className='w-full ml-5'>
                            <div>
                                <Text size="9" as="span" align="center" mt="2" mr={'4'}>
                                    Time:
                                </Text>
                                <AnimatedText message={offenseReport.time} className='w-fit text-3xl' animationSpeed={300} />
                            </div>
                            <div>
                                <Text size="9" as="span" align="center" mt="2" mr={'4'}>
                                    Location:
                                </Text>
                                <AnimatedText className='w-fit text-xl' message={offenseReport.location} animationSpeed={150} />
                            </div>
                            <div className='max-w-[600px] min-h-[100px] self-start'>
                                <AnimatedText className='w-fit text-3xl text-left self-start' message={offenseReport.description} animationSpeed={50} />
                            </div>

                        </Flex>
                    </Flex>
                    {handleNext && (
                        <div className='w-full text-center mt-6 justify-self-end' >
                            <Text as='span' className='w-full' size='7' >Click to continue</Text>
                        </div>
                    )}
                </Flex>
            </Card>
        );
    }

    return (
        <Card className="p-8 offenseReport" style={{ width: width }} onClick={handleNext}>
            <Inset clip="padding-box" side="top" pb="current">
                <img
                    src={offenseReport.imgSrc || sampleImage[index || 0]}
                    className="block object-cover w-full h-64 sm:h-80 md:h-90 bg-gray-200"
                />
            </Inset>

            <div>
                <Text size="6" as="span" align="center" mt="2" mr={'4'}>
                    Time:
                </Text>
                <AnimatedText message={offenseReport.time} className='w-fit' animationSpeed={300} />
            </div>
            <div>
                <Text size="6" as="span" align="center" mt="2" mr={'4'}>
                    Location:
                </Text>
                <AnimatedText message={offenseReport.location} animationSpeed={150} />
            </div>
            <div className='max-w-[600px] min-h-[100px]'>
                <AnimatedText message={offenseReport.description} animationSpeed={50} />
            </div>
            {handleNext && (
                <div className='w-full text-center mt-9' >
                    <Text as='span' size='3' >Click to continue</Text>
                </div>
            )}
        </Card>
    );


};