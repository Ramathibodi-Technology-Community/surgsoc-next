import * as React from 'react';
import { Text, Button, Section, Heading } from '@react-email/components';
import { BaseTemplate } from '../components/BaseTemplate';

interface RegistrationAcceptedEmailProps {
  userName: string;
  eventName: string;
  eventDate: string;
  location: string;
  confirmUrl: string;
  declineUrl: string;
  message?: string | null;
  requiresLoa?: boolean;
}

export const RegistrationAcceptedEmail: React.FC<RegistrationAcceptedEmailProps> = ({
  userName,
  eventName,
  eventDate,
  location,
  confirmUrl,
  declineUrl,
  message,
  requiresLoa,
}) => {
  return (
    <BaseTemplate previewText={`You've been accepted to ${eventName}!`}>
      <Heading style={h1}>Congratulations! 🎉</Heading>
      <Text style={text}>
        Dear {userName},
      </Text>
      <Text style={text}>
        We are pleased to inform you that your registration for <strong>{eventName}</strong> has been accepted.
      </Text>

      {message && <Text style={{ ...text, whiteSpace: 'pre-wrap' }}>{message}</Text>}
      <Section style={details}>
        <Text style={detailText}>📅 <strong>Date:</strong> {eventDate}</Text>
        <Text style={detailText}>📍 <strong>Location:</strong> {location}</Text>
      </Section>

      <Text style={text}>
        Please confirm your attendance or decline if you can no longer make it.
      </Text>

      <Section style={btnContainer}>
        <Button style={{...button, backgroundColor: '#237f70'}} href={confirmUrl}>
          Confirm Attendance
        </Button>
      </Section>

      <Section style={btnContainer}>
        <Button style={{...button, backgroundColor: 'transparent', color: '#b4232a', border: '1px solid #b4232a', marginTop: '10px'}} href={declineUrl}>
          {requiresLoa ? 'Decline (Submit Leave of Absence)' : 'Decline'}
        </Button>
      </Section>
    </BaseTemplate>
  );
};

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const details = {
  backgroundColor: '#f3f5f8',
  borderRadius: '4px',
  padding: '16px',
  margin: '20px 0',
};

const detailText = {
  margin: '5px 0',
  fontSize: '16px',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '10px 0',
};

const button = {
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  width: '100%',
  padding: '12px',
};

export default RegistrationAcceptedEmail;
