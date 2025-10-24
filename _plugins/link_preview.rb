# _plugins/link_preview.rb
require 'nokogiri'
require 'open-uri'
require 'json'
require 'fileutils'
require 'digest'

module Jekyll
  module LinkPreview
    class << self
      attr_accessor :cache_dir, :site_url
    end

    # 초기화
    Jekyll::Hooks.register :site, :after_init do |site|
      LinkPreview.cache_dir = File.join(site.source, '_cache', 'link_preview')
      LinkPreview.site_url = site.config['url'] || ''
      FileUtils.mkdir_p(LinkPreview.cache_dir)
    end

    # 포스트 렌더링 후 처리
    Jekyll::Hooks.register :posts, :post_render do |post|
      post.output = process_html(post.output)
    end

    # 페이지 렌더링 후 처리
    Jekyll::Hooks.register :pages, :post_render do |page|
      if page.output_ext == '.html'
        page.output = process_html(page.output)
      end
    end

    def self.process_html(html)
      # 전체 HTML Document로 파싱 (구조 유지)
      doc = Nokogiri::HTML(html)
      
      # content 영역만 선택 (.post.prose 또는 article 태그)
      content_area = doc.at_css('.post.prose') || doc.at_css('article') || doc.at_css('body')
      
      return html unless content_area
      
      # content 영역 내부의 p 태그만 처리
      content_area.css('p').each do |paragraph|
        process_paragraph(paragraph)
      end

      # 전체 HTML 반환 (구조 유지)
      doc.to_html
    end

    def self.process_paragraph(paragraph)
      links = paragraph.css('a[href]')
      return if links.empty?

      # 외부 링크만 필터링
      external_links = links.select do |link|
        href = link['href']
        href && 
        href.start_with?('http://', 'https://') && 
        !href.include?(LinkPreview.site_url)
      end

      return if external_links.empty?

      # OG 데이터 수집
      links_data = external_links.map do |link|
        fetch_og_data(link['href'])
      end.compact

      return if links_data.empty?

      # 링크 프리뷰 트리거 버튼 생성 (TailwindCSS 사용)
      trigger = create_trigger_element(links_data)
      paragraph.add_child(trigger)
    end

    def self.fetch_og_data(url)
      return nil unless url

      # 캐시 체크
      cache_key = Digest::MD5.hexdigest(url)
      cache_file = File.join(LinkPreview.cache_dir, "#{cache_key}.json")

      if File.exist?(cache_file)
        cache_data = JSON.parse(File.read(cache_file))
        # 7일 캐시
        if Time.now.to_i - cache_data['timestamp'] < 7 * 24 * 60 * 60
          return cache_data['data']
        end
      end

      # OG 데이터 가져오기
      og_data = scrape_og_data(url)
      
      # 캐시 저장
      File.write(cache_file, JSON.generate({
        'data' => og_data,
        'timestamp' => Time.now.to_i
      }))

      og_data
    rescue => e
      Jekyll.logger.warn "LinkPreview:", "Failed to fetch OG data for #{url}: #{e.message}"
      nil
    end

    def self.scrape_og_data(url)
      # User-Agent 설정
      html = URI.open(url, 
        'User-Agent' => 'Mozilla/5.0 (compatible; Jekyll LinkPreview/1.0)',
        read_timeout: 5
      ).read

      doc = Nokogiri::HTML(html)
      
      # domain 안전하게 추출
      domain = begin
        URI.parse(url).host
      rescue
        url
      end
      
      {
        'url' => url,
        'title' => get_meta_content(doc, 'og:title') || doc.at_css('title')&.text || url,
        'description' => get_meta_content(doc, 'og:description') || get_meta_content(doc, 'description') || '',
        'image' => get_meta_content(doc, 'og:image') || '',
        'domain' => domain
      }
    rescue => e
      Jekyll.logger.warn "LinkPreview:", "Error scraping #{url}: #{e.message}"
      
      # 안전하게 domain 추출
      domain = begin
        URI.parse(url).host
      rescue
        url
      end
      
      {
        'url' => url,
        'title' => url,
        'description' => '',
        'image' => '',
        'domain' => domain
      }
    end

    def self.get_meta_content(doc, property)
      meta = doc.at_css("meta[property='#{property}']") || 
             doc.at_css("meta[name='#{property}']")
      meta&.[]('content')
    end

    def self.create_trigger_element(links_data)
      data_json = JSON.generate(links_data).gsub("'", '&#39;')
      
      Nokogiri::HTML::DocumentFragment.parse(<<~HTML)
        <span class="link-preview-trigger" data-links='#{data_json}'>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          <span class="link-count">#{links_data.length}</span>
        </span>
      HTML
    end
  end
end