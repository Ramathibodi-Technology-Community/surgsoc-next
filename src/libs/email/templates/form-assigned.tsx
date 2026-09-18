import * as React from 'react';
import { Text, Button, Section, Heading } from '@react-email/components';
import { BaseTemplate } from '../components/BaseTemplate';

interface FormAssignedEmailProps {
  userName: string;
  formName: string;
  formUrl: string;
  deadline?: string;
  message?: string;
}

export const FormAssignedEmail: React.FC<FormAssignedEmailProps> = ({
  userName,
  formName,
  formUrl,
  deadline,
  message,
}) => {
  return (
    <BaseTemplate previewText={`New form assigned: ${formName}`}>
      <Heading style={h1}>New Form Assigned 📝</Heading>
      <Text style={text}>
        Dear {userName},
      </Text>
      <Text style={text}>
        You have been assigned a new form: <strong>{formName}</strong>.
      </Text>

      {message && (
        <Text style={text}>
            {message}
        </Text>
      )}

      <Section style={details}>
        {deadline && <Text style={detailText}>📅 <strong>Deadline:</strong> {deadline}</Text>}
      </Section>

      <Section style={btnContainer}>
        <Button style={{...button, backgroundColor: '#007bff'}} href={formUrl}>
          Complete Form Now
        </Button>
      </Section>

      <Text style={smallText}>
          If the button doesn't work, copy this link: {formUrl}
      </Text>
    </BaseTemplate>
  );
};

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const details = {
  backgroundColor: '#eff6ff',
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
  margin: '30px 0',
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

const smallText = {
    fontSize: '12px',
    color: '#888',
    textAlign: 'center' as const,
    marginTop: '20px',
};

export default FormAssignedEmail;
