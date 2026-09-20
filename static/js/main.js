document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Modal logic
    const modals = {
        addMemberModal: {
            btn: document.querySelectorAll('.add-member-btn'),
            modal: document.getElementById('addMemberModal'),
            close: document.querySelector('#addMemberModal .close-modal')
        },
        confirmRegModal: {
            btn: document.getElementById('finalSubmitBtn'),
            modal: document.getElementById('confirmRegModal'),
            close: document.querySelector('#confirmRegModal .close-modal'),
            cancelBtn: document.querySelector('#confirmRegModal .cancel-btn')
        }
    };

    // Setup Modals
    Object.values(modals).forEach(({ btn, modal, close, cancelBtn }) => {
        if (!modal) return;
        
        // Open modal
        if (btn) {
            if (btn instanceof NodeList) {
                btn.forEach(b => b.addEventListener('click', () => {
                    modal.style.display = 'flex';
                }));
            } else {
                btn.addEventListener('click', () => {
                    modal.style.display = 'flex';
                });
            }
        }
        
        // Close modal (x button)
        if (close) {
            close.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        // Close modal (cancel button)
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });

    // Admin dashboard - View Team Details Modal
    const viewTeamBtns = document.querySelectorAll('.view-team-btn');
    if (viewTeamBtns.length > 0) {
        viewTeamBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const teamId = btn.getAttribute('data-team-id');
                const modal = document.getElementById(`teamModal${teamId}`);
                if (modal) {
                    modal.style.display = 'flex';
                    
                    const closeBtn = modal.querySelector('.close-modal');
                    closeBtn.addEventListener('click', () => {
                        modal.style.display = 'none';
                    });
                }
            });
        });
    }

    // Close any modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Auto-hide flash messages after 5 seconds
    const flashMessages = document.querySelector('.flash-messages');
    if (flashMessages) {
        setTimeout(() => {
            flashMessages.style.opacity = '0';
            setTimeout(() => {
                flashMessages.style.display = 'none';
            }, 300);
        }, 5000);
    }
});


    
