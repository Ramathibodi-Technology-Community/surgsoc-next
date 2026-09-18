import * as React from 'react';
import { Text, Section, Heading, Img } from '@react-email/components';
import { BaseTemplate } from '../components/BaseTemplate';
import QRCode from 'qrcode'; // We'll need to install this or generate on the fly

interface RegistrationConfirmedEmailProps {
  userName: string;
  eventName: string;
  eventDate: string;
  location: string;
  lineQrCode: string; // URL to QR code image or base64
  lineGroupUrl?: string;
}

export const RegistrationConfirmedEmail: React.FC<RegistrationConfirmedEmailProps> = ({
  userName,
  eventName,
  eventDate,
  location,
  lineQrCode,
  lineGroupUrl,
}) => {
  return (
    <BaseTemplate previewText={`Your spot for ${eventName} is confirmed!`}>
      <Heading style={h1}>Your place is confirmed</Heading>
      <Text style={text}>
        Dear {userName},
      </Text>
      <Text style={text}>
        Thank you for confirming your attendance for <strong>{eventName}</strong>. We look forward to seeing you there!
      </Text>

      <Section style={details}>
        <Text style={detailText}>📅 <strong>Date:</strong> {eventDate}</Text>
        <Text style={detailText}>📍 <strong>Location:</strong> {location}</Text>
      </Section>

      <Heading style={h2}>Join the Event Group</Heading>
      <Text style={text}>
        Please scan the QR code below or click the link to join the official LINE OpenChat for this event.
      </Text>

      <Section style={qrContainer}>
        {lineQrCode && (
           <Img src={lineQrCode} width="200" height="200" alt="LINE Group QR Code" style={qrImage} />
        )}
      </Section>

      {lineGroupUrl && (
          <Text style={{ ...text, textAlign: 'center' }}>
            <a href={lineGroupUrl}>Click here to join directly</a>
          </Text>
      )}

    </BaseTemplate>
  );
};

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0 10px',
  textAlign: 'center' as const,
};

const h2 = {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '30px 0 10px',
    textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const details = {
  backgroundColor: '#f4f4f4',
  borderRadius: '4px',
  padding: '16px',
  margin: '20px 0',
};

const detailText = {
  margin: '5px 0',
  fontSize: '16px',
};

const qrContainer = {
    textAlign: 'center' as const,
    margin: '20px 0',
};

const qrImage = {
    margin: '0 auto',
};

export default RegistrationConfirmedEmail;
