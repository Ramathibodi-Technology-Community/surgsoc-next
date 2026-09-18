import * as React from 'react';
import { Text, Heading, Section } from '@react-email/components';
import { BaseTemplate } from '../components/BaseTemplate';

interface RegistrationRejectedEmailProps {
  userName: string;
  eventName: string;
  reason?: string;
  contactEmail: string;
}

export const RegistrationRejectedEmail: React.FC<RegistrationRejectedEmailProps> = ({
  userName,
  eventName,
  reason,
  contactEmail,
}) => {
  return (
    <BaseTemplate previewText={`Update regarding your registration for ${eventName}`}>
      <Heading style={h1}>Registration Update</Heading>
      <Text style={text}>
        Dear {userName},
      </Text>
      <Text style={text}>
        Thank you for your interest in <strong>{eventName}</strong>. We appreciate you taking the time to apply.
      </Text>

      <Text style={text}>
        Due to limited capacity, we are unable to offer you a spot at this event. This was a difficult decision, and we hope you understand.
      </Text>

      {reason && (
        <Section style={reasonBox}>
          <Text style={reasonTitle}><strong>Reason:</strong></Text>
          <Text style={reasonText}>{reason}</Text>
        </Section>
      )}

      <Text style={text}>
        We encourage you to apply for future events! If you have any questions, please contact us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </Text>

    </BaseTemplate>
  );
};

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0',
  color: '#333',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const reasonBox = {
  backgroundColor: '#fff0f0',
  borderLeft: '4px solid #dc3545',
  padding: '15px',
  margin: '20px 0',
};

const reasonTitle = {
  margin: '0 0 5px 0',
  color: '#dc3545',
};

const reasonText = {
  margin: '0',
  color: '#333',
};

export default RegistrationRejectedEmail;
