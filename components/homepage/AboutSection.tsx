import React from 'react';

interface AboutSectionProps {
  title?: string;
  subtitle?: string;
  description: string;
  link?: {
    label: string;
    url: string;
    target?: string;
  };
}

const AboutSection: React.FC<AboutSectionProps> = ({
  title = "About Nadanaloga",
  subtitle = "Who we are",
  description,
  link
}) => {
  return (
    <div className="mxd-section padding-hero-01 padding-pre-manifest mobile-point-subtitle">
      <div className="mxd-container no-padding-container">
        <div className="mxd-block">
          <div className="mxd-manifest">
            <h6 className="mxd-manifest__subtitle anim-uni-in-up">
              {subtitle}
            </h6>
            <div className="mxd-manifest__text anim-uni-in-up">
              <p>{description}</p>
            </div>
            {link && (
              <div className="mxd-manifest__controls anim-uni-in-up">
                <a 
                  href={link.url}
                  className="btn btn-anim btn-default btn-outline slide-right-up"
                  target={link.target || '_parent'}
                >
                  <span className="btn-caption">{link.label}</span>
                  <i className="ph-bold ph-arrow-up-right"></i>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSection;