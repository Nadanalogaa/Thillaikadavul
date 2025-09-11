import React from 'react';

interface Program {
  id: string;
  title: string;
  description: string;
  image?: string;
  tags?: string[];
  link?: string;
}

interface ProgramsSectionProps {
  programs: Program[];
  title?: string;
  subtitle?: string;
  description?: string;
  viewAllLink?: string;
}

const ProgramsSection: React.FC<ProgramsSectionProps> = ({
  programs,
  title = "Our Programs",
  subtitle = "What we offer",
  description = "Explore courses that blend tradition with engaging, modern teaching",
  viewAllLink = "/courses"
}) => {
  if (programs.length === 0) {
    return null;
  }

  return (
    <div className="mxd-section padding-pre-stack">
      <div className="mxd-container no-padding-container">
        <div className="mxd-block">
          <div className="mxd-pinned-projects">
            <div className="container-fluid px-0">
              <div className="row gx-0">
                
                {/* Left side - Section title and description */}
                <div className="col-12 col-xl-5 mxd-pinned-projects__static">
                  <div className="mxd-pinned-projects__static-inner no-margin">
                    <div className="mxd-section-title no-margin-desktop">
                      <div className="container-fluid p-0">
                        <div className="row g-0">
                          <div className="col-12 mxd-grid-item no-margin">
                            <div className="mxd-section-title__title anim-uni-in-up">
                              <h2 className="reveal-type">{title}</h2>
                            </div>
                          </div>
                          <div className="col-12 mxd-grid-item no-margin">
                            <div className="mxd-section-title__descr anim-uni-in-up">
                              <p>{description}</p>
                            </div>
                          </div>
                          <div className="col-12 mxd-grid-item no-margin">
                            <div className="mxd-section-title__controls anim-uni-in-up">
                              <a 
                                className="btn btn-anim btn-default btn-outline slide-right-up" 
                                href={viewAllLink} 
                                target="_parent"
                              >
                                <span className="btn-caption">All Programs</span>
                                <i className="ph-bold ph-arrow-up-right"></i>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Programs list */}
                <div className="col-12 col-xl-7 mxd-pinned-projects__scroll">
                  <div className="mxd-pinned-projects__scroll-inner mxd-grid-item no-margin">
                    {programs.map((program, index) => (
                      <div key={program.id} className="mxd-project-item">
                        
                        {/* Program Image */}
                        <a 
                          className="mxd-project-item__media anim-uni-in-up" 
                          href={program.link || viewAllLink} 
                          target="_parent"
                        >
                          <div 
                            className={`mxd-project-item__preview preview-image-${index + 1} parallax-img-small`}
                            style={{
                              backgroundImage: `url('${program.image || '/static/images/placeholder-course.webp'}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          ></div>
                          
                          {/* Program Tags */}
                          {program.tags && program.tags.length > 0 && (
                            <div className="mxd-project-item__tags">
                              {program.tags.map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex} 
                                  className="tag tag-default tag-permanent"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </a>

                        {/* Program Info */}
                        <div className="mxd-project-item__promo">
                          <h3 className="mxd-project-item__title anim-uni-in-up">
                            <a href={program.link || viewAllLink} target="_parent">
                              {program.title}
                            </a>
                          </h3>
                          <p className="mxd-project-item__descr anim-uni-in-up">
                            {program.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramsSection;