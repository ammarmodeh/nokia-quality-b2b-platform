import { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Stack,
    useTheme,
    useMediaQuery,
    Breadcrumbs,
    Avatar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    Card,
    CardContent,
    Alert
} from '@mui/material';
import {
    MdExpandMore,
    MdBook,
    MdLocationOn,
    MdPhone,
    MdPhoneMissed,
    MdSettings,
    MdSignalCellularAlt,
    MdWifi,
    MdCheckCircle,
    MdInfo
} from 'react-icons/md';

const TechnicalGlossary = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [expanded, setExpanded] = useState('work-orders');

    const handleChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    const sectionStyle = {
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        mb: 2,
        border: '1px solid #3d3d3d',
        '&:before': {
            display: 'none',
        },
    };

    const summaryStyle = {
        backgroundColor: '#2d2d2d',
        '&:hover': {
            backgroundColor: '#333',
        },
    };

    return (
        <Box sx={{ p: isMobile ? 2 : 4, minHeight: '100vh', color: '#ffffff' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, color: '#b3b3b3' }}>
                    <Typography color="inherit">Resources</Typography>
                    <Typography color="text.primary" sx={{ fontWeight: 'bold', color: '#7b68ee' }}>
                        Technical Glossary
                    </Typography>
                </Breadcrumbs>

                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#7b68ee', width: 56, height: 56 }}>
                        <MdBook size={32} />
                    </Avatar>
                    <Box>
                        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', color: '#ffffff' }}>
                            Gaia Technical System Guide
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                            Understanding work orders, terminology, and technical concepts
                        </Typography>
                    </Box>
                </Stack>

                <Alert severity="info" sx={{ backgroundColor: '#1e3a5f', color: '#ffffff', border: '1px solid #3d5a7f' }}>
                    This guide helps you understand the different types of work orders and technical terms used in the Nokia Quality / Gaia system.
                </Alert>
            </Box>

            {/* Work Order Types Comparison */}
            <Accordion
                expanded={expanded === 'work-orders'}
                onChange={handleChange('work-orders')}
                sx={sectionStyle}
            >
                <AccordionSummary
                    expandIcon={<MdExpandMore color="#7b68ee" size={24} />}
                    sx={summaryStyle}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MdSettings color="#7b68ee" size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Work Order Types in Gaia System
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Typography variant="body1" sx={{ mb: 3, color: '#b3b3b3' }}>
                        In the Gaia system, we use different <strong>Subtask Types</strong> to categorize how quality assurance work is performed. Each type has a specific workflow and purpose.
                    </Typography>

                    {/* Visit Type */}
                    <Card sx={{ mb: 3, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <MdLocationOn size={28} color="#4caf50" />
                                <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                    Visit (On-Site Work Order)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>
                                Work is performed <strong>on-site</strong> at the customer location (home, business, exchange, cabinet, or field site).
                            </Typography>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b68ee' }}>Characteristics:</Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Physical presence required</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Hands-on technical work and infrastructure assessment</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Direct customer interaction</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ May affect live service during work</Typography>
                            </Stack>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b68ee' }}>Typical Examples:</Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• ONT placement verification and optimization</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Wi-Fi coverage assessment and repeater setup</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Optical signal quality testing</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Customer technical education (in-person)</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Service feedback collection</Typography>
                            </Stack>
                            <Box sx={{ mt: 2, p: 2, backgroundColor: '#0d3d0d', borderRadius: 1, border: '1px solid #2d5d2d' }}>
                                <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                    👉 Focus: Physical infrastructure work + Customer service quality
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Phone Type */}
                    <Card sx={{ mb: 3, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <MdPhone size={28} color="#2196f3" />
                                <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                                    Phone (Remote Work Order)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>
                                Work is performed <strong>remotely</strong> via phone call without physical site visit.
                            </Typography>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b68ee' }}>Characteristics:</Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Remote troubleshooting and support</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ No physical presence required</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Customer-reported information based</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Faster resolution for simple issues</Typography>
                            </Stack>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b68ee' }}>Typical Examples:</Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Remote Wi-Fi coverage evaluation</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Speed test guidance and interpretation</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Wi-Fi frequency band explanation (2.4GHz vs 5GHz)</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Internet-based application troubleshooting (IPTV, VPN)</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Service rating instructions</Typography>
                            </Stack>
                            <Box sx={{ mt: 2, p: 2, backgroundColor: '#0d2d4d', borderRadius: 1, border: '1px solid #2d4d6d' }}>
                                <Typography variant="caption" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                                    👉 Focus: Remote support + Customer guidance
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* No Answer Type */}
                    <Card sx={{ mb: 3, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <MdPhoneMissed size={28} color="#ff9800" />
                                <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                    No Answer / Others (Alternative Resolution)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>
                                Work order closed due to <strong>customer unavailability</strong> or <strong>special circumstances</strong> that prevent standard resolution.
                            </Typography>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b68ee' }}>Characteristics:</Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Customer contact unsuccessful</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Customer declined service</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Administrative closure required</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>✓ Documentation of closure reason mandatory</Typography>
                            </Stack>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b68ee' }}>Typical Examples:</Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• No response from customer after multiple attempts</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Visit declined by customer</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Service cancellation initiated</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Incorrect contact details</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Issue belongs to another department</Typography>
                            </Stack>
                            <Box sx={{ mt: 2, p: 2, backgroundColor: '#4d2d0d', borderRadius: 1, border: '1px solid #6d4d2d' }}>
                                <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                    👉 Focus: Administrative closure + Documentation
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Comparison Table */}
                    <Typography variant="h6" sx={{ mt: 4, mb: 2, color: '#7b68ee' }}>Quick Comparison</Typography>
                    <TableContainer component={Paper} sx={{ backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: '#7b68ee', fontWeight: 'bold', borderBottom: '1px solid #3d3d3d' }}>Aspect</TableCell>
                                    <TableCell sx={{ color: '#4caf50', fontWeight: 'bold', borderBottom: '1px solid #3d3d3d' }}>Visit</TableCell>
                                    <TableCell sx={{ color: '#2196f3', fontWeight: 'bold', borderBottom: '1px solid #3d3d3d' }}>Phone</TableCell>
                                    <TableCell sx={{ color: '#ff9800', fontWeight: 'bold', borderBottom: '1px solid #3d3d3d' }}>No Answer</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>Location</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>On-site / Field</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>Remote</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>N/A</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>Physical work</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>Yes</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>No</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>No</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>Service status</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>Active / May be affected</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>Active</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid #3d3d3d' }}>Varies</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ color: '#b3b3b3', borderBottom: 'none' }}>Customer impact</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: 'none' }}>Direct interaction</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: 'none' }}>Phone support</TableCell>
                                    <TableCell sx={{ color: '#e0e0e0', borderBottom: 'none' }}>No contact</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </AccordionDetails>
            </Accordion>

            {/* ISP/Telecom Terminology */}
            <Accordion
                expanded={expanded === 'terminology'}
                onChange={handleChange('terminology')}
                sx={sectionStyle}
            >
                <AccordionSummary
                    expandIcon={<MdExpandMore color="#7b68ee" size={24} />}
                    sx={summaryStyle}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MdSignalCellularAlt color="#7b68ee" size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            ISP / Telecom Terminology
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        {/* ONT */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                ONT (Optical Network Terminal)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                The device installed at the customer's premises that converts optical fiber signals to electrical signals for use with internet, phone, and TV services. Also known as "modem" in common language.
                            </Typography>
                        </Paper>

                        {/* FTTH */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                FTTH (Fiber To The Home)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A fiber optic network architecture that delivers high-speed internet directly to residential homes using optical fiber cables.
                            </Typography>
                        </Paper>

                        {/* SLID */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                SLID (Service Line Identifier)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A unique identifier assigned to each customer's service line. Used to track and manage individual customer connections in the network.
                            </Typography>
                        </Paper>

                        {/* QoS */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                QoS (Quality of Service)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                The measurement and management of service quality delivered to customers. Includes metrics like speed, reliability, customer satisfaction (NPS), and technical performance.
                            </Typography>
                        </Paper>

                        {/* NPS */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                NPS (Net Promoter Score)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A customer satisfaction metric that measures how likely customers are to recommend the service to others. Scored from 0-10, with customers categorized as Detractors (0-6), Passives (7-8), or Promoters (9-10).
                            </Typography>
                        </Paper>

                        {/* FDB */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                FDB (Fiber Distribution Box)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A cabinet or enclosure in the field that houses fiber optic connections and splitters. It distributes fiber connections from the main network to individual customer locations.
                            </Typography>
                        </Paper>

                        {/* DSLAM / OLT */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                OLT (Optical Line Terminal) / DSLAM
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Network equipment at the service provider's central office that manages and controls fiber optic connections to customer ONTs. The OLT is the fiber equivalent of a DSLAM (used for DSL connections).
                            </Typography>
                        </Paper>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* Wi-Fi Technical Terms */}
            <Accordion
                expanded={expanded === 'wifi'}
                onChange={handleChange('wifi')}
                sx={sectionStyle}
            >
                <AccordionSummary
                    expandIcon={<MdExpandMore color="#7b68ee" size={24} />}
                    sx={summaryStyle}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MdWifi color="#7b68ee" size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Wi-Fi Technical Concepts
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        {/* 2.4GHz vs 5GHz */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                2.4GHz vs 5GHz Frequency Bands
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 2 }}>
                                Modern Wi-Fi routers broadcast on two different frequency bands:
                            </Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                    <strong style={{ color: '#4caf50' }}>2.4GHz:</strong> Longer range, better wall penetration, slower speeds, more interference
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                    <strong style={{ color: '#2196f3' }}>5GHz:</strong> Shorter range, less wall penetration, faster speeds, less interference
                                </Typography>
                            </Stack>
                        </Paper>

                        {/* Wi-Fi Repeater */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Wi-Fi Repeater / Range Extender
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A device that receives the Wi-Fi signal from the main router and rebroadcasts it to extend coverage to areas with weak signal. Proper placement is critical for optimal performance.
                            </Typography>
                        </Paper>

                        {/* Signal Strength */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Wi-Fi Signal Strength (dBm)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                Measured in decibels (dBm), indicates the power of the Wi-Fi signal:
                            </Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#4caf50' }}>• -30 to -50 dBm: Excellent</Typography>
                                <Typography variant="body2" sx={{ color: '#8bc34a' }}>• -50 to -60 dBm: Good</Typography>
                                <Typography variant="body2" sx={{ color: '#ff9800' }}>• -60 to -70 dBm: Fair</Typography>
                                <Typography variant="body2" sx={{ color: '#f44336' }}>• -70 dBm or lower: Weak</Typography>
                            </Stack>
                        </Paper>

                        {/* Wi-Fi 6 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Wi-Fi 6 (802.11ax)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                The latest Wi-Fi standard offering faster speeds, better performance in crowded areas, improved battery life for connected devices, and enhanced security.
                            </Typography>
                        </Paper>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* Field Team Concepts */}
            <Accordion
                expanded={expanded === 'field-team'}
                onChange={handleChange('field-team')}
                sx={sectionStyle}
            >
                <AccordionSummary
                    expandIcon={<MdExpandMore color="#7b68ee" size={24} />}
                    sx={summaryStyle}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MdCheckCircle color="#7b68ee" size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Field Team & Quality Assurance
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        {/* Field Team */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Field Team
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Technicians who perform installation, maintenance, and troubleshooting work at customer locations. They are responsible for ensuring service quality and customer satisfaction.
                            </Typography>
                        </Paper>

                        {/* QA Audit */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Quality Assurance (QA) Audit
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A systematic evaluation of field team work to ensure compliance with standards, verify technical quality, and identify areas for improvement. Conducted via site visits or phone calls.
                            </Typography>
                        </Paper>

                        {/* Detractor */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Detractor
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A customer who rates their service experience 0-6 on the NPS scale. These customers are unhappy and require immediate follow-up to address concerns and improve satisfaction.
                            </Typography>
                        </Paper>

                        {/* Promoter */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Promoter
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A customer who rates their service experience 9-10 on the NPS scale. These are highly satisfied customers who are likely to recommend the service to others.
                            </Typography>
                        </Paper>

                        {/* Checkpoint */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Checkpoint
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                A specific quality verification point within a subtask. Each checkpoint evaluates a particular aspect of service delivery (e.g., ONT placement, signal quality, customer education).
                            </Typography>
                        </Paper>

                        {/* Resolution Status */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Resolution Status
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                The outcome of a quality assurance task:
                            </Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• <strong>Answered and resolved:</strong> Issue addressed successfully</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• <strong>Appointment scheduled:</strong> Follow-up visit arranged</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• <strong>No Answer:</strong> Customer unreachable</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• <strong>Pending:</strong> Awaiting action or information</Typography>
                            </Stack>
                        </Paper>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* GAIA Transaction Codes */}
            <Accordion
                expanded={expanded === 'gaia-codes'}
                onChange={handleChange('gaia-codes')}
                sx={sectionStyle}
            >
                <AccordionSummary
                    expandIcon={<MdExpandMore color="#7b68ee" size={24} />}
                    sx={summaryStyle}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MdSettings color="#7b68ee" size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            GAIA Transaction Codes & Status
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Alert severity="info" sx={{ mb: 3, backgroundColor: '#1e3a5f', color: '#ffffff', border: '1px solid #3d5a7f' }}>
                        GAIA (Global Activity & Issue Aggregator) uses standardized codes to track work orders, outcomes, and failure reasons across the telecom network.
                    </Alert>

                    {/* Transaction Types */}
                    <Typography variant="h6" sx={{ mb: 2, color: '#7b68ee', fontWeight: 'bold' }}>
                        Transaction Types (Activity Codes)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: '#b3b3b3' }}>
                        These codes identify the <strong>type of work</strong> being performed on a customer's service or network infrastructure.
                    </Typography>

                    <Stack spacing={2} sx={{ mb: 4 }}>
                        {/* MOD */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="MOD" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Modification (Upgrade/Reschedule)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Service modification request such as speed upgrade, plan change, or appointment rescheduling. Used when customer wants to change existing service parameters.
                            </Typography>
                        </Paper>

                        {/* DMOK */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="DMOK" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Demand OK (Manual Dispatch OK)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Manual approval for dispatching a technician to the site. Confirms that the work order has been reviewed and approved for field team assignment.
                            </Typography>
                        </Paper>

                        {/* VAL */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="VAL" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Validate / Validation
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Quality validation check to verify that work was completed correctly. Often performed by supervisors or QA teams to ensure service standards are met.
                            </Typography>
                        </Paper>

                        {/* MOD */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="MOD" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Modification (Upgrade/Reschedule)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Request to modify an existing service, upgrade bandwidth, or reschedule an active appointment.
                            </Typography>
                        </Paper>

                        {/* DMOK */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="DMOK" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Demand OK (Manual Dispatch OK)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Manual confirmation that a demand is valid and ready for dispatch. Used when system automation requires manual override/validation.
                            </Typography>
                        </Paper>

                        {/* VAL */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="VAL" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Validate / Validation
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                General validation activity for customer data, technical feasibility, or service availability.
                            </Typography>
                        </Paper>

                        {/* SWO */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="SWO" size="small" sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                    Site Work Order (Modem Swap/Install)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                Physical work performed at customer site. Includes ONT/modem installation, replacement, or hardware upgrades. Requires technician presence.
                            </Typography>
                        </Paper>

                        {/* LWO */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #2196f3' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="LWO" size="small" sx={{ bgcolor: '#2196f3', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                                    Live Work Order (Linking to Activation)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                Work performed on active/live customer service. Includes service activation, port configuration, VLAN changes, or profile updates on running connections. May cause temporary service interruption.
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                                💡 Can be performed remotely or on-site, but service is actively running
                            </Typography>
                        </Paper>

                        {/* RWO */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="RWO" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Return / Re-work Order
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Follow-up work order to correct issues from previous installation or service. Used when initial work was incomplete or needs correction.
                            </Typography>
                        </Paper>

                        {/* PSR */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="PSR" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Post Site Report (Submission)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Documentation submission after site visit. Technician reports work completed, materials used, and any issues encountered during the visit.
                            </Typography>
                        </Paper>

                        {/* MUTIN */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="MUTIN" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Mutation / Transfer
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Service transfer between locations or account ownership change. Used when customer moves to a new address or transfers service to another person.
                            </Typography>
                        </Paper>

                        {/* DNEn */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="DNEn" size="small" sx={{ bgcolor: '#7b68ee', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                                    Dunning Enable (Billing/Collections)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Billing and collections activity. Enables dunning process for overdue payments or activates billing-related actions on the account.
                            </Typography>
                        </Paper>
                    </Stack>

                    <Divider sx={{ my: 3, backgroundColor: '#3d3d3d' }} />

                    {/* Outcome States */}
                    <Typography variant="h6" sx={{ mb: 2, color: '#7b68ee', fontWeight: 'bold' }}>
                        Outcome States (Transaction Result Codes)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: '#b3b3b3' }}>
                        These codes indicate the <strong>result or current status</strong> of a transaction after it has been processed.
                    </Typography>

                    <Stack spacing={2} sx={{ mb: 4 }}>
                        {/* FE */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="FE" size="small" sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                    Field Execution (On-Site Work Performed)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Physical work executed at the customer site or field location. Indicates that a technician has performed hands-on work such as installation, repair, testing, or equipment replacement.
                            </Typography>
                        </Paper>

                        {/* VA */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="VA" size="small" sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                    Valid / Validated / Approved
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Transaction successfully validated and approved. Work order has been reviewed and confirmed as complete and correct.
                            </Typography>
                        </Paper>

                        {/* RE */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #ff9800' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="RE" size="small" sx={{ bgcolor: '#ff9800', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                    Returned / Rejected / Re-queue
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Transaction returned for correction or re-queued for processing. Requires additional action or information.
                            </Typography>
                        </Paper>

                        {/* PS */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #2196f3' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="PS" size="small" sx={{ bgcolor: '#2196f3', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                                    Pending Schedule / Partially Successful
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Transaction is awaiting scheduling or was partially completed. Some aspects succeeded while others require follow-up.
                            </Typography>
                        </Paper>

                        {/* OP */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #9e9e9e' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="OP" size="small" sx={{ bgcolor: '#9e9e9e', color: '#fff', fontWeight: 'bold' }} />
                                <Typography variant="subtitle1" sx={{ color: '#9e9e9e', fontWeight: 'bold' }}>
                                    Open
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                Transaction is currently open and in progress. Work has not yet been completed or validated.
                            </Typography>
                        </Paper>
                    </Stack>

                    <Divider sx={{ my: 3, backgroundColor: '#3d3d3d' }} />

                    {/* Unfulfillment & Failure Reason Codes */}
                    <Typography variant="h6" sx={{ mb: 2, color: '#7b68ee', fontWeight: 'bold' }}>
                        Unfulfillment & Failure Reason Codes
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: '#b3b3b3' }}>
                        These numeric codes explain <strong>why a transaction failed</strong> or could not be completed. They are grouped for better tracking and resolution.
                    </Typography>

                    {/* 100 Series: Customer Requests & Availability */}
                    <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: '#00bcd4', fontWeight: 'bold' }}>
                        100 Series: Customer Requests & Availability
                    </Typography>
                    <Stack spacing={2} sx={{ mb: 3 }}>
                        {/* 101 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #00bcd4' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="101" size="small" sx={{ bgcolor: '#00bcd4', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Callback Requested by Customer
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Customer asked to be contacted again after specific period (e.g., "call me back next week").
                            </Typography>
                        </Paper>

                        {/* 102 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #00bcd4' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="102" size="small" sx={{ bgcolor: '#00bcd4', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Visit Postponed by Customer Request
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Customer requested to reschedule visit to specific future date.
                            </Typography>
                        </Paper>

                        {/* 103 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #00bcd4' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="103" size="small" sx={{ bgcolor: '#00bcd4', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Customer Busy / Requested Later Contact
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Customer answered but requested to be contacted at different time (e.g., "call me later today").
                            </Typography>
                        </Paper>

                        {/* 104 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #00bcd4' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="104" size="small" sx={{ bgcolor: '#00bcd4', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Customer Refused Visit / Cancellation
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Customer decided to cancel the request or refused the site visit.
                            </Typography>
                        </Paper>

                        {/* 105 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #ff9800' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="105" size="small" sx={{ bgcolor: '#ff9800', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Customer No Show / Absent
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Customer was not present at scheduled appointment time. Technician arrived but could not access premises. (RE29)
                            </Typography>
                        </Paper>
                    </Stack>

                    {/* 200 Series: Resolutions & Findings */}
                    <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: '#4caf50', fontWeight: 'bold' }}>
                        200 Series: Resolutions & Findings
                    </Typography>
                    <Stack spacing={2} sx={{ mb: 3 }}>
                        {/* 201 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="201" size="small" sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    No Issue Found / False Alarm
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Customer confirmed service is working fine. No problem exists upon investigation.
                            </Typography>
                        </Paper>

                        {/* 202 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="202" size="small" sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Issue Resolved via Phone Call
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Problem fixed remotely during phone conversation. No site visit needed.
                            </Typography>
                        </Paper>

                        {/* 203 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="203" size="small" sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Technical Team Visited & Resolved
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Field technician visited customer site and successfully resolved the issue.
                            </Typography>
                        </Paper>

                        {/* 204 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #2196f3' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="204" size="small" sx={{ bgcolor: '#2196f3', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Scheduled for Site Survey / Inspection
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Requires site survey or technical assessment before installation can proceed. (722 / كشف)
                            </Typography>
                        </Paper>

                        {/* 205 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="205" size="small" sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Documentation Updated / Completed
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Missing documentation or information has been provided/updated.
                            </Typography>
                        </Paper>
                    </Stack>

                    {/* 300 Series: Status & Monitoring */}
                    <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: '#ff9800', fontWeight: 'bold' }}>
                        300 Series: Status & Monitoring
                    </Typography>
                    <Stack spacing={2} sx={{ mb: 3 }}>
                        {/* 301 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #2196f3' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="301" size="small" sx={{ bgcolor: '#2196f3', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Customer Will Monitor & Report
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Customer wants to observe service before scheduling visit. Will report back if problem persists.
                            </Typography>
                        </Paper>

                        {/* 302 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #ff5722' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="302" size="small" sx={{ bgcolor: '#ff5722', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Escalated to Higher Level Support
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Issue requires specialized team or senior engineer intervention.
                            </Typography>
                        </Paper>

                        {/* 303 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #ff9800' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="303" size="small" sx={{ bgcolor: '#ff9800', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Pending Equipment/Parts Arrival
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Waiting for hardware (ONT, router, etc.) to arrive before work can proceed. (RES03)
                            </Typography>
                        </Paper>

                        {/* 304 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #ff9800' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="304" size="small" sx={{ bgcolor: '#ff9800', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Waiting for Civil Works / Third Party
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Delayed pending infrastructure work (trenching, ducting, power site issues). (602 / 888)
                            </Typography>
                        </Paper>

                        {/* 305 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #f44336' }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Chip label="305" size="small" sx={{ bgcolor: '#f44336', color: '#fff', fontWeight: 'bold', minWidth: 80 }} />
                                <Typography variant="subtitle2" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                                    Technical Impediment / Network Issue
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                                Network Access Point (NAP) full, no signal, or oversubscription issues. (721 / 901)
                            </Typography>
                        </Paper>
                    </Stack>

                    {/* Quick Reference Box */}
                    <Box sx={{ mt: 3, p: 2, backgroundColor: '#0d3d0d', borderRadius: 1, border: '1px solid #2d5d2d' }}>
                        <Typography variant="subtitle2" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 1 }}>
                            💡 Quick Reference
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                            <strong>Transaction Type</strong> = What work is being done<br />
                            <strong>Outcome State</strong> = Current status/result<br />
                            <strong>Unfulfillment Code</strong> = Why it failed (if applicable)
                        </Typography>
                    </Box>
                </AccordionDetails>
            </Accordion>

            {/* Interview-Ready Definitions */}
            <Accordion
                expanded={expanded === 'interview'}
                onChange={handleChange('interview')}
                sx={sectionStyle}
            >
                <AccordionSummary
                    expandIcon={<MdExpandMore color="#7b68ee" size={24} />}
                    sx={summaryStyle}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MdInfo color="#7b68ee" size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Interview-Ready Quick Definitions
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Alert severity="success" sx={{ mb: 3, backgroundColor: '#0d3d0d', color: '#ffffff', border: '1px solid #2d5d2d' }}>
                        Use these concise definitions when explaining the system to stakeholders or during interviews.
                    </Alert>

                    <Stack spacing={2}>
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="body2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Q: What is a "Visit" work order?
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                <strong>A:</strong> A quality assurance task where we physically visit the customer's location to verify installation quality, test technical parameters, and ensure customer satisfaction through direct interaction.
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="body2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Q: What is a "Phone" work order?
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                <strong>A:</strong> A remote quality assurance task conducted via phone call to verify service quality, provide technical guidance, and collect customer feedback without requiring a site visit.
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="body2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Q: What does the Gaia system do?
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                <strong>A:</strong> Gaia is our quality management platform that tracks field team performance, manages customer satisfaction audits, and ensures service delivery standards are met across all installations and support activities.
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="body2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Q: How do you measure service quality?
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                <strong>A:</strong> We use a comprehensive checkpoint system covering technical aspects (ONT placement, signal quality, Wi-Fi coverage) and customer service aspects (professionalism, education, feedback collection). Each checkpoint is scored and tracked for continuous improvement.
                            </Typography>
                        </Paper>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* GAIA Master Transaction Log Fields */}
            <Accordion
                expanded={expanded === 'gaia-fields'}
                onChange={handleChange('gaia-fields')}
                sx={sectionStyle}
            >
                <AccordionSummary
                    expandIcon={<MdExpandMore color="#7b68ee" size={24} />}
                    sx={summaryStyle}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MdInfo color="#7b68ee" size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            GAIA Master Transaction Log - Field Definitions
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Alert severity="info" sx={{ mb: 3, backgroundColor: '#1e3a5f', color: '#ffffff', border: '1px solid #3d5a7f' }}>
                        Understanding each field in the GAIA Master Transaction Log helps you record accurate, meaningful transaction history.
                    </Alert>

                    <Stack spacing={2}>
                        {/* Execution Date */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Execution Date
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 2 }}>
                                The <strong>actual date when the transaction/activity occurred or will occur</strong>, not when it was recorded in the system.
                            </Typography>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b68ee' }}>Examples:</Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Visit completed on Jan 25 → Execution Date = Jan 25 (even if you record it on Jan 29)</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Appointment scheduled for Feb 1 → Execution Date = Feb 1 (the future appointment date)</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• Phone call made today → Execution Date = Today</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• N/A → For administrative actions with no specific execution time</Typography>
                            </Stack>
                            <Box sx={{ mt: 2, p: 2, backgroundColor: '#0d2d4d', borderRadius: 1, border: '1px solid #2d4d6d' }}>
                                <Typography variant="caption" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                                    💡 Key Distinction: Execution Date = When work happened/will happen | Timestamp = When you logged it
                                </Typography>
                            </Box>
                        </Paper>

                        {/* System Flow Status */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                System Flow Status
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 2 }}>
                                Indicates the <strong>overall task status</strong> at the time of this transaction. Shows the progression of the case through its lifecycle.
                            </Typography>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#ff9800' }}>• <strong>Todo:</strong> Task created but not yet started</Typography>
                                <Typography variant="body2" sx={{ color: '#2196f3' }}>• <strong>In Progress:</strong> Work is ongoing (appointments set, investigations underway)</Typography>
                                <Typography variant="body2" sx={{ color: '#4caf50' }}>• <strong>Closed:</strong> Issue resolved and case completed</Typography>
                            </Stack>
                        </Paper>

                        {/* Transaction Type */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Transaction Type (Activity Code)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 2 }}>
                                Identifies the <strong>type of work</strong> being performed. Choose based on what action is being taken.
                            </Typography>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b68ee' }}>Common Usage:</Typography>
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• <strong>MOD:</strong> Scheduling/rescheduling appointments, plan changes</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• <strong>VAL:</strong> Phone calls, remote validation, quality checks</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• <strong>SWO:</strong> Physical site visits with hands-on work</Typography>
                                <Typography variant="body2" sx={{ color: '#b3b3b3' }}>• <strong>DMOK:</strong> Dispatch approval for field team</Typography>
                            </Stack>
                        </Paper>

                        {/* Outcome State */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="subtitle1" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Outcome State (Result Code)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 2 }}>
                                Indicates the <strong>result or current status</strong> of the transaction after processing.
                            </Typography>
                            <Divider sx={{ my: 2, backgroundColor: '#3d3d3d' }} />
                            <Stack spacing={1} sx={{ pl: 2 }}>
                                <Typography variant="body2" sx={{ color: '#4caf50' }}>• <strong>VA:</strong> Successfully validated/approved/completed</Typography>
                                <Typography variant="body2" sx={{ color: '#4caf50' }}>• <strong>FE:</strong> Field execution performed (on-site work done)</Typography>
                                <Typography variant="body2" sx={{ color: '#2196f3' }}>• <strong>PS:</strong> Pending schedule or partially successful</Typography>
                                <Typography variant="body2" sx={{ color: '#ff9800' }}>• <strong>RE:</strong> Returned/rejected/needs rework</Typography>
                                <Typography variant="body2" sx={{ color: '#9e9e9e' }}>• <strong>OP:</strong> Open and in progress</Typography>
                            </Stack>
                        </Paper>
                    </Stack>

                    <Divider sx={{ my: 3, backgroundColor: '#3d3d3d' }} />

                    {/* Practical Usage Guide */}
                    <Typography variant="h6" sx={{ mb: 2, color: '#7b68ee', fontWeight: 'bold' }}>
                        Practical Usage Guide - Common Scenarios
                    </Typography>

                    <Stack spacing={2}>
                        {/* Scenario 1 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Typography variant="subtitle2" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 1 }}>
                                ✅ Scenario: Customer Visit Resolved Issue
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                <strong>Use:</strong> SWO/FE/208 or SWO/VA/208
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#b3b3b3' }}>
                                Execution Date = Visit date | Status = Closed | Note = "Technician replaced ONT, service restored"
                            </Typography>
                        </Paper>

                        {/* Scenario 2 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #2196f3' }}>
                            <Typography variant="subtitle2" sx={{ color: '#2196f3', fontWeight: 'bold', mb: 1 }}>
                                📅 Scenario: Appointment Scheduled
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                <strong>Use:</strong> MOD/PS/102
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#b3b3b3' }}>
                                Execution Date = Appointment date | Status = In Progress | Note = "Visit scheduled for Feb 1, 2PM"
                            </Typography>
                        </Paper>

                        {/* Scenario 3 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #ff9800' }}>
                            <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 1 }}>
                                ⏸️ Scenario: Customer Postponed Visit
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                <strong>Use:</strong> MOD/PS/102
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#b3b3b3' }}>
                                Execution Date = New appointment date | Status = In Progress | Note = "Customer requested reschedule to next week"
                            </Typography>
                        </Paper>

                        {/* Scenario 4 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #4caf50' }}>
                            <Typography variant="subtitle2" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 1 }}>
                                📞 Scenario: Resolved by Phone
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                <strong>Use:</strong> VAL/VA/202
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#b3b3b3' }}>
                                Execution Date = Today | Status = Closed | Note = "Guided customer to reboot ONT, service restored"
                            </Typography>
                        </Paper>

                        {/* Scenario 5 */}
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #ff9800' }}>
                            <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 1 }}>
                                🚫 Scenario: Customer Not Home
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
                                <strong>Use:</strong> SWO/RE/105
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#b3b3b3' }}>
                                Execution Date = Visit attempt date | Status = In Progress | Note = "Technician arrived, customer absent"
                            </Typography>
                        </Paper>
                    </Stack>

                    <Box sx={{ mt: 3, p: 2, backgroundColor: '#0d3d0d', borderRadius: 1, border: '1px solid #2d5d2d' }}>
                        <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                            💡 Pro Tip: Use MOD for scheduling activities, VAL for remote work, and SWO only when physical site work is performed or attempted.
                        </Typography>
                    </Box>
                </AccordionDetails>
            </Accordion>

            {/* Interview-Ready Quick Definitions */}
            <Accordion
                expanded={expanded === 'quick-reference'}
                onChange={handleChange('quick-reference')}
                sx={sectionStyle}
            >
                <AccordionSummary
                    expandIcon={<MdExpandMore color="#7b68ee" size={24} />}
                    sx={summaryStyle}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <MdInfo color="#7b68ee" size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Interview-Ready Quick Definitions
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Alert severity="success" sx={{ mb: 3, backgroundColor: '#0d3d0d', color: '#ffffff', border: '1px solid #2d5d2d' }}>
                        Use these concise definitions when explaining the system to stakeholders or during interviews.
                    </Alert>

                    <Stack spacing={2}>
                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="body2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Q: What is a "Visit" work order?
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                <strong>A:</strong> A quality assurance task where we physically visit the customer's location to verify installation quality, test technical parameters, and ensure customer satisfaction through direct interaction.
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="body2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Q: What is a "Phone" work order?
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                <strong>A:</strong> A remote quality assurance task conducted via phone call to verify service quality, provide technical guidance, and collect customer feedback without requiring a site visit.
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="body2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Q: What does the Gaia system do?
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                <strong>A:</strong> Gaia is our quality management platform that tracks field team performance, manages customer satisfaction audits, and ensures service delivery standards are met across all installations and support activities.
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }}>
                            <Typography variant="body2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
                                Q: How do you measure service quality?
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                                <strong>A:</strong> We use a comprehensive checkpoint system covering technical aspects (ONT placement, signal quality, Wi-Fi coverage) and customer service aspects (professionalism, education, feedback collection). Each checkpoint is scored and tracked for continuous improvement.
                            </Typography>
                        </Paper>
                    </Stack>
                </AccordionDetails>
            </Accordion >
        </Box >
    );
};

export default TechnicalGlossary;
