import React from 'react';

interface CTALink {
  label: string;
  url: string;
  target?: string;
  type?: 'primary' | 'secondary' | 'ghost';
}

interface CTASectionProps {
  title: string;
  description?: string;
  links: CTALink[];
  className?: string;
}

const CTASection: React.FC<CTASectionProps> = ({
  title,
  description,
  links,
  className = ""
}) => {
  return (
    <div className={`mxd-section overflow-hidden ${className}`}>
      <div className="mxd-container no-padding-container">
        <div className="mxd-block">
          <div className="mxd-cta-block">
            <div className="mxd-cta-block__content">
              <h2 className="mxd-cta-block__title anim-uni-in-up">
                {title}
              </h2>
              {description && (
                <p className="mxd-cta-block__description anim-uni-in-up">
                  {description}
                </p>
              )}
              {links.length > 0 && (
                <div className="mxd-cta-block__controls anim-uni-in-up">
                  {links.map((link, index) => (
                    <a 
                      key={index}
                      href={link.url}
                      className={`btn btn-anim btn-default ${
                        link.type === 'primary' ? 'btn-filled' :
                        link.type === 'ghost' ? 'btn-ghost' :
                        'btn-outline'
                      } slide-right-up`}
                      target={link.target || '_parent'}
                    >
                      <span className="btn-caption">{link.label}</span>
                      <i className="ph-bold ph-arrow-up-right"></i>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTASection;